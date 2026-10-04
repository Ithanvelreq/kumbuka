import { useState } from "react";
import { api, type Patient } from "@/lib/api";

interface Props {
  role: "patient" | "doctor";
  onLoggedIn: (who: Patient, pin: string) => void;
}

export function LoginScreen({ role, onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [id, setId] = useState(role === "patient" ? "demo-noor" : "");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (role === "doctor") {
      // DEMO: doctor accounts are not stored; the doctor phone only needs a display name.
      if (!id.trim() || !/^\d{4,6}$/.test(pin)) return setError("Enter an ID and a 4-6 digit PIN");
      return onLoggedIn({ id: id.trim(), display_name: id.trim() }, pin);
    }
    setBusy(true);
    const res = mode === "signup" ? await api.signup(id.trim(), pin, name.trim()) : await api.login(id.trim(), pin);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    onLoggedIn(res.data.patient, pin);
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3 p-5">
      <h2 className="text-lg font-semibold">{role === "patient" ? (mode === "login" ? "Log in" : "Sign up") : "Doctor log in"}</h2>
      <input className={input} placeholder="ID" value={id} onChange={(e) => setId(e.target.value)} autoCapitalize="none" />
      <input className={input} placeholder="PIN (4-6 digits)" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" type="password" />
      {role === "patient" && mode === "signup" && (
        <input className={input} placeholder="Display name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      )}
      {error && <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{error}</div>}
      <button disabled={busy} className="rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "…" : mode === "signup" ? "Create account" : "Log in"}
      </button>
      {role === "patient" && (
        <button type="button" className="text-xs text-slate-600 underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New here? Sign up" : "Have an ID? Log in"}
        </button>
      )}
      <p className="mt-auto text-[11px] leading-snug text-slate-500">
        Demo: PIN is not verified yet (stub). {role === "doctor" ? "Doctor accounts are not stored." : "Try ID demo-noor (synthetic)."}
      </p>
    </form>
  );
}
