import { useState } from "react";
import type { InstructionType } from "@/lib/api";
import { AudioPicker, type PickedAudio } from "./AudioPicker";

const TYPES: { value: InstructionType; label: string }[] = [
  { value: "doctor_diagnosis", label: "Diagnosis" },
  { value: "doctor_prescription", label: "Prescription" },
  { value: "symptom_log", label: "Consult recap" },
];

interface Props {
  disabled: boolean;
  onSend: (type: InstructionType, input: { text: string } | { audio: PickedAudio }) => void;
}

/** Doctor types or speaks a diagnosis/prescription. No length cap. */
export function InstructionForm({ disabled, onSend }: Props) {
  const [type, setType] = useState<InstructionType>("doctor_prescription");
  const [text, setText] = useState("");
  const [speak, setSpeak] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-200 p-3">
      <div className="flex gap-2">
        <select className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as InstructionType)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-200 px-3 text-xs font-semibold" onClick={() => setSpeak(!speak)}>
          {speak ? "⌨ Type" : "🎤 Speak"}
        </button>
      </div>
      {speak ? (
        <AudioPicker disabled={disabled} onReady={(audio) => onSend(type, { audio })} />
      ) : (
        <div className="flex gap-2">
          <textarea
            className="min-h-[3rem] flex-1 resize-none rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="Message to patient (sent in full)"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            disabled={disabled || !text.trim()}
            className="rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => {
              onSend(type, { text: text.trim() });
              setText("");
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
