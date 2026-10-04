import { useRef, useState } from "react";
import { api, type Patient } from "@/lib/api";
import { LANGS } from "@/lib/langs";
import { AudioPicker, type PickedAudio } from "./AudioPicker";
import { LoginScreen } from "./LoginScreen";
import { PhoneFrame } from "./PhoneFrame";
import { bubble, BubbleList, type Bubble } from "./SmsBubble";

const PATIENT_LANG = "sw";

export function PatientPhone() {
  const [session, setSession] = useState<{ patient: Patient; pin: string } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set<string>());
  const push = (...b: Bubble[]) => setBubbles((prev) => [...prev, ...b]);

  async function checkMessages() {
    if (!session) return;
    setBusy(true);
    const res = await api.inbox(session.patient.id, session.pin);
    setBusy(false);
    if (!res.ok) return push(bubble("error", res.message));
    const fresh = res.data.messages.filter((m) => !seen.current.has(m.id));
    fresh.forEach((m) => seen.current.add(m.id));
    if (fresh.length === 0) return push(bubble("info", "Hakuna ujumbe mpya (no new messages)"));
    push(
      ...fresh.map((m) => {
        const label = m.type === "doctor_prescription" ? "Dawa (prescription)" : "Daktari (doctor)";
        const meta = `${label} · ${m.created_at.slice(0, 10)}`;
        return m.needs_review ? bubble("flagged", "Message from your doctor. Please ask a person to read it with you.", meta) : bubble("in", m.text, meta);
      }),
    );
  }

  async function send(audio: PickedAudio) {
    if (!session) return;
    push(bubble("out", `🎤 ${audio.label}`));
    setBusy(true);
    const res = await api.ingest(session.patient.id, session.pin, audio.payload, PATIENT_LANG);
    setBusy(false);
    if (!res.ok) return push(bubble("error", res.message));
    const c = res.data.event.content;
    push(
      c.needs_review
        ? bubble("flagged", `Saved, but a person will check it.`, c.review_reason ?? undefined)
        : bubble("in", `Imepokelewa ✓ (received)`, `Logged (English): ${c.note_en}`),
    );
  }

  return (
    <PhoneFrame title="Patient phone" subtitle={`Language: ${LANGS[PATIENT_LANG]}${session ? ` · ${session.patient.display_name ?? session.patient.id}` : ""}`}>
      {!session ? (
        <LoginScreen role="patient" onLoggedIn={(patient, pin) => setSession({ patient, pin })} />
      ) : (
        <>
          <BubbleList bubbles={bubbles} busy={busy} />
          <div className="flex flex-col gap-2 border-t border-slate-200 p-3">
            <button disabled={busy} onClick={checkMessages} className="rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
              📥 Ujumbe (messages)
            </button>
            <AudioPicker disabled={busy} onReady={send} />
          </div>
        </>
      )}
    </PhoneFrame>
  );
}
