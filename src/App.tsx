import { BasicPhone } from "./components/BasicPhone";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-slate-100 p-6">
      <header className="max-w-xl text-center">
        <h1 className="text-2xl font-semibold">Kumbuka – health ledger demo</h1>
        <p className="mt-1 text-xs text-slate-600">
          Simulates a call from any basic phone: keypad menu, voice in, voice out. Patient and doctor use the same call
          (press 1 or 2). Every AI output is a draft; it never diagnoses or advises. Records are stored in English.
          Demo uses cloud inference (Groq) and stores data unencrypted; the intended design runs locally on a mini-PC
          with PIN-derived encryption. Demo patient: number <b>1001</b>, any 4-digit PIN.
        </p>
      </header>
      <BasicPhone />
    </main>
  );
}
