import { DoctorPhone } from "./components/DoctorPhone";
import { PatientPhone } from "./components/PatientPhone";

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-slate-100 p-6">
      <header className="max-w-3xl text-center">
        <h1 className="text-2xl font-semibold">Kumbuka – health ledger demo</h1>
        <p className="mt-1 text-xs text-slate-600">
          Every AI output is a draft. It never diagnoses or advises. Demo uses cloud inference (Groq) and stores data unencrypted;
          the intended design runs locally on a mini-PC with PIN-derived encryption.
        </p>
      </header>
      <div className="flex flex-wrap justify-center gap-10">
        <PatientPhone />
        <DoctorPhone />
      </div>
    </main>
  );
}
