import { useState } from "react";
import { api, type InstructionType, type Patient } from "@/lib/api";
import { LANGS } from "@/lib/langs";
import type { PickedAudio } from "./AudioPicker";
import { InstructionForm } from "./InstructionForm";
import { LoginScreen } from "./LoginScreen";
import { PhoneFrame } from "./PhoneFrame";
import { bubble, BubbleList, type Bubble } from "./SmsBubble";

export function DoctorPhone() {
  const [doctor, setDoctor] = useState<Patient | null>(null);
  const [patientId, setPatientId] = useState("demo-noor");
  const [patientPin, setPatientPin] = useState("");
  const [lang, setLang] = useState("en");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [busy, setBusy] = useState(false);
  const push = (...b: Bubble[]) => setBubbles((prev) => [...prev, ...b]);

  async function retrieveHistory() {
    push(bubble("out", `History for ${patientId}?`));
    setBusy(true);
    const res = await api.retrieve(patientId.trim(), patientPin, lang);
    setBusy(false);
    if (!res.ok) return push(bubble("error", res.message));
    const { summary, fallback, entries } = res.data;
    push(bubble("in", summary, fallback ? "Automatic summary unavailable, plain list shown" : `AI draft · ${LANGS[lang]}`));
    for (const e of entries.filter((x) => x.needs_review)) {
      push(bubble("flagged", e.transcript_en ? `Heard (English): “${e.transcript_en}”` : "No usable transcript", `${e.created_at.slice(0, 10)} · ${e.review_reason ?? ""}`));
    }
  }

  async function sendInstruction(type: InstructionType, input: { text: string } | { audio: PickedAudio }) {
    push(bubble("out", "text" in input ? input.text : `🎤 ${input.audio.label}`, `→ ${patientId}`));
    setBusy(true);
    // Typed text is in the doctor's selected language; spoken audio is auto-detected by Whisper.
    const res = await api.logInstruction(patientId.trim(), patientPin, type, lang, "text" in input ? input : { audio: input.audio.payload });
    setBusy(false);
    if (!res.ok) return push(bubble("error", res.message));
    const c = res.data.event.content;
    const sent = `Sent. Patient sees (${LANGS.sw}): ${String(c.details.text_patient ?? "")}`;
    push(c.needs_review ? bubble("flagged", "Saved, but the patient will be asked to check with a person.", c.review_reason ?? undefined) : bubble("in", sent, `Stored (English): ${c.note_en}`));
  }

  const input = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <PhoneFrame title="Doctor phone" subtitle={doctor ? `Dr. ${doctor.display_name} · reads in ${LANGS[lang]}` : undefined}>
      {!doctor ? (
        <LoginScreen role="doctor" onLoggedIn={(d) => setDoctor(d)} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3">
            <input className={input} placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
            <input className={input} placeholder="Patient PIN" value={patientPin} onChange={(e) => setPatientPin(e.target.value)} type="password" inputMode="numeric" />
            <select className={input} value={lang} onChange={(e) => setLang(e.target.value)}>
              {Object.entries(LANGS).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            <button disabled={busy || !patientId || !patientPin} onClick={retrieveHistory} className="rounded-lg bg-slate-800 text-sm font-semibold text-white disabled:opacity-50">
              Retrieve history
            </button>
          </div>
          <BubbleList bubbles={bubbles} busy={busy} />
          <InstructionForm disabled={busy || !patientId || !patientPin} onSend={sendInstruction} />
        </>
      )}
    </PhoneFrame>
  );
}
