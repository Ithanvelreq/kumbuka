import type { ReactNode } from "react";

export function PhoneFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex h-[680px] w-[340px] flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-slate-800 bg-white shadow-xl">
      <div className="bg-slate-800 px-4 pb-2 pt-1 text-white">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-slate-300">{subtitle}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
