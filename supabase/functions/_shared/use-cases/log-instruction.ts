// Flow 3: doctor text or audio -> English (stored) + patient's language (shown) -> event.
// No length cap: the doctor's message is passed through in full. The model only translates.
import { NotFoundError, ServiceBusyError, ValidationError } from "../domain/errors.ts";
import { decideNeedsReview, numbersPreserved } from "../domain/needs-review.ts";
import type { AudioInput, InstructionTranslation, PatientStore, Storage, Summarizer, Transcriber } from "../domain/ports.ts";
import { validateContent } from "../domain/schema.ts";
import type { ContentCore, Event, NewEvent, TranscriptSegment } from "../domain/types.ts";

export const INSTRUCTION_TYPES = ["doctor_diagnosis", "doctor_prescription", "symptom_log"] as const;
export type InstructionType = (typeof INSTRUCTION_TYPES)[number];

export interface LogInstructionInput {
  patientId: string;
  pin: string;
  type: InstructionType;
  /** Doctor's language for typed text. Ignored for audio (Whisper output is already English). */
  sourceLang: string;
  patientLang: string;
  text?: string;
  audio?: AudioInput;
}

export interface LogInstructionDeps {
  storage: Storage;
  patients: PatientStore;
  transcriber: Transcriber;
  summarizer: Pick<Summarizer, "translateInstruction">;
}

export async function logInstruction(input: LogInstructionInput, deps: LogInstructionDeps): Promise<Event> {
  const hasText = typeof input.text === "string" && input.text.trim() !== "";
  if (hasText === !!input.audio) throw new ValidationError("Provide exactly one of text or audio");
  if (!(await deps.patients.find(input.patientId))) throw new NotFoundError("Unknown patient");

  let sourceText: string;
  let sourceLang: string;
  let segments: TranscriptSegment[] | undefined;
  if (input.audio) {
    try {
      const t = await deps.transcriber.translateToEnglish(input.audio, input.sourceLang);
      sourceText = t.text_en;
      segments = t.segments;
    } finally {
      input.audio.bytes.fill(0); // no audio persisted
    }
    sourceLang = "en";
  } else {
    sourceText = input.text!.trim();
    sourceLang = input.sourceLang;
  }

  let tr: InstructionTranslation | null = null;
  if (sourceText.trim() !== "") {
    try {
      tr = await deps.summarizer.translateInstruction(sourceText, sourceLang, input.patientLang);
    } catch (err) {
      if (err instanceof ServiceBusyError) throw err;
    }
  }
  const parsedOk = !!tr && typeof tr.text_en === "string" && typeof tr.text_patient === "string";
  const textEn = parsedOk ? tr!.text_en.trim() : sourceLang === "en" ? sourceText : "";
  const textPatient = parsedOk ? tr!.text_patient.trim() : "";
  const llmConfidence = parsedOk ? tr!.confidence ?? "low" : "low";

  const review = decideNeedsReview({ segments, sourceText, llmConfidence, noteEn: textEn, parsedOk });
  const reasons = review.review_reason ? [review.review_reason] : [];
  if (parsedOk && (!numbersPreserved(sourceText, textEn) || !numbersPreserved(sourceText, textPatient))) {
    reasons.push("Numbers differ after translation");
  }
  if (parsedOk && textPatient === "") reasons.push("Empty patient translation");
  const needsReview = reasons.length > 0;

  const core: ContentCore = {
    note_en: textEn,
    confidence: needsReview && llmConfidence === "high" ? "medium" : llmConfidence,
    needs_review: needsReview,
    review_reason: needsReview ? reasons.join("; ") : null,
    details: {
      input: input.audio ? "audio" : "text",
      // What the doctor actually said/typed, so a person can resolve anything unclear.
      original_text: sourceText,
      patient_lang: input.patientLang,
      text_patient: textPatient,
    },
  };

  const event = (input.type === "symptom_log"
    ? { type: "symptom_log", content: { ...core, reported_by: "doctor" }, source_lang: sourceLang }
    : { type: input.type, content: core, source_lang: sourceLang }) as NewEvent;

  const checked = validateContent(event.type, event.content);
  if (!checked.ok) throw new ValidationError(`Invalid content: ${checked.error}`);
  return deps.storage.store(input.patientId, event, input.pin);
}
