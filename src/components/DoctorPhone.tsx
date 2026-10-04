import { useState } from "react";
import { api, type Patient } from "@/lib/api";
import { LANGS } from "@/lib/langs";
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
        </>
      )}
    </PhoneFrame>
  );
}
