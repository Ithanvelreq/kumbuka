import { useState } from "react";
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
  const push = (...b: Bubble[]) => setBubbles((prev) => [...prev, ...b]);

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
          <div className="border-t border-slate-200 p-3">
            <AudioPicker disabled={busy} onReady={send} />
          </div>
        </>
      )}
    </PhoneFrame>
  );
}
