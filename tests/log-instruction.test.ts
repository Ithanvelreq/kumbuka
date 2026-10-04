import { test } from "node:test";
import assert from "node:assert/strict";
import { numbersPreserved } from "../supabase/functions/_shared/domain/needs-review.ts";
import { ServiceBusyError } from "../supabase/functions/_shared/domain/errors.ts";
import type { InstructionTranslation } from "../supabase/functions/_shared/domain/ports.ts";
import { inbox } from "../supabase/functions/_shared/use-cases/inbox.ts";
import { logInstruction } from "../supabase/functions/_shared/use-cases/log-instruction.ts";
import { FakeSummarizer, FakeTranscriber, MemoryPatients, MemoryStorage } from "./fakes.ts";

const RX = "Paracetamol 500 mg twice a day for 3 days.";
const RX_SW = "Paracetamol 500 mg mara mbili kwa siku kwa siku 3.";

function setup(translation?: InstructionTranslation | Error, transcript = { text_en: RX, segments: [{ avg_logprob: -0.1, no_speech_prob: 0.01 }] }) {
  const patients = new MemoryPatients();
  patients.rows.set("noor", { id: "noor", display_name: null, pin_check: null });
  const deps = {
    storage: new MemoryStorage(), patients,
    transcriber: new FakeTranscriber(transcript),
    summarizer: new FakeSummarizer({ translation: translation ?? { text_en: RX, text_patient: RX_SW, confidence: "high" } }),
  };
  return deps;
}
const base = { patientId: "noor", pin: "1", type: "doctor_prescription" as const, sourceLang: "en", patientLang: "sw" };

test("typed prescription is stored in English with the patient-language text, uncapped", async () => {
  const deps = setup();
  const e = await logInstruction({ ...base, text: RX }, deps);
  assert.equal(e.type, "doctor_prescription");
  assert.equal(e.content.note_en, RX);
  assert.equal(e.content.needs_review, false);
  assert.equal(e.content.details.text_patient, RX_SW);
  assert.equal(e.content.details.original_text, RX);
  assert.deepEqual(deps.summarizer.calls[0].args, [RX, "en", "sw"]);
});

test("audio is transcribed, wiped, then translated from English", async () => {
  const deps = setup();
  const audio = { bytes: new Uint8Array([9, 9]), mimeType: "audio/webm" };
  const e = await logInstruction({ ...base, sourceLang: "fr", audio }, deps);
  assert.deepEqual([...audio.bytes], [0, 0]);
  assert.equal(e.source_lang, "en");
  assert.equal(e.content.details.input, "audio");
  assert.equal(deps.summarizer.calls[0].args[1], "en");
});

test("changed dose numbers force review", async () => {
  const deps = setup({ text_en: RX, text_patient: "Paracetamol 50 mg mara mbili kwa siku 3.", confidence: "high" });
  const e = await logInstruction({ ...base, text: RX }, deps);
  assert.equal(e.content.needs_review, true);
  assert.match(e.content.review_reason!, /Numbers differ/);
});

test("translation failure is stored as unclear, never guessed", async () => {
  const deps = setup(new SyntaxError("bad json"));
  const e = await logInstruction({ ...base, sourceLang: "fr", text: "Prendre du repos pendant deux jours" }, deps);
  assert.equal(e.content.needs_review, true);
  assert.equal(e.content.note_en, "");
  assert.equal(e.content.details.text_patient, "");
});

test("consult recap is a doctor-reported symptom_log", async () => {
  const deps = setup({ text_en: "Patient reports headache for 3 days.", text_patient: "Kichwa kinauma siku 3.", confidence: "high" });
  const e = await logInstruction({ ...base, type: "symptom_log", text: "Patient reports headache for 3 days." }, deps);
  assert.equal(e.type, "symptom_log");
  assert.equal(e.type === "symptom_log" && e.content.reported_by, "doctor");
});

test("exactly one of text or audio", async () => {
  const deps = setup();
  await assert.rejects(logInstruction({ ...base }, deps), /exactly one/);
  await assert.rejects(logInstruction({ ...base, text: "x", audio: { bytes: new Uint8Array(1), mimeType: "audio/webm" } }, deps), /exactly one/);
});

test("busy propagates and nothing is stored", async () => {
  const deps = setup(new ServiceBusyError());
  await assert.rejects(logInstruction({ ...base, text: RX }, deps), ServiceBusyError);
  assert.equal(deps.storage.events.length, 0);
});

test("inbox shows doctor messages in patient language, flagged ones as unclear", async () => {
  const deps = setup();
  await logInstruction({ ...base, text: RX }, deps);
  deps.summarizer.responses.translation = { text_en: RX, text_patient: "garbled", confidence: "low" };
  await logInstruction({ ...base, type: "doctor_diagnosis", text: RX }, deps);
  await deps.storage.store("noor", { type: "symptom_log", content: { reported_by: "patient", note_en: "x", confidence: "high", needs_review: false, review_reason: null, details: {} }, source_lang: "sw" });
  const msgs = await inbox({ patientId: "noor", pin: "1" }, deps);
  assert.deepEqual(msgs.map((m) => [m.type, m.text]), [["doctor_prescription", RX_SW], ["doctor_diagnosis", "Unclear, ask a person"]]);
});

test("numbersPreserved", () => {
  assert.equal(numbersPreserved("500 mg x 2", "2 fois 500 mg"), true);
  assert.equal(numbersPreserved("1.5 ml", "1,5 ml"), true);
  assert.equal(numbersPreserved("500 mg", "50 mg"), false);
});
