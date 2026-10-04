export type BubbleKind = "out" | "in" | "flagged" | "error" | "info";

const STYLES: Record<BubbleKind, string> = {
  out: "self-end bg-emerald-600 text-white",
  in: "self-start bg-slate-200 text-slate-900",
  flagged: "self-start border border-amber-400 bg-amber-50 text-amber-900",
  error: "self-center bg-red-100 text-red-800",
  info: "self-center bg-transparent text-xs text-slate-500",
};

export interface Bubble {
  id: string;
  kind: BubbleKind;
  text: string;
  meta?: string;
}

export function SmsBubble({ bubble }: { bubble: Bubble }) {
  return (
    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${STYLES[bubble.kind]}`}>
      {bubble.kind === "flagged" && <div className="text-xs font-semibold">⚠ Unclear, ask a person</div>}
      {bubble.text}
      {bubble.meta && <div className="mt-1 text-[11px] opacity-70">{bubble.meta}</div>}
    </div>
  );
}

export function BubbleList({ bubbles, busy }: { bubbles: Bubble[]; busy?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 p-3">
      {bubbles.map((b) => (
        <SmsBubble key={b.id} bubble={b} />
      ))}
      {busy && <div className="self-center text-xs text-slate-500">…working</div>}
    </div>
  );
}

let n = 0;
export const bubble = (kind: BubbleKind, text: string, meta?: string): Bubble => ({ id: `b${++n}`, kind, text, meta });
