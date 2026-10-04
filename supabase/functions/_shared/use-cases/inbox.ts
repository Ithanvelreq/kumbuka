// Messages for the patient's phone: doctor diagnoses/prescriptions in the patient's language.
import { NotFoundError } from "../domain/errors.ts";
import type { PatientStore, Storage } from "../domain/ports.ts";
import { type Event, UNCLEAR_LABEL } from "../domain/types.ts";

export interface InboxMessage {
  id: string;
  type: "doctor_diagnosis" | "doctor_prescription";
  created_at: string;
  /** Doctor's message in the patient's language, or UNCLEAR_LABEL if flagged. Never a guess. */
  text: string;
  needs_review: boolean;
}

export async function inbox(input: { patientId: string; pin: string }, deps: { storage: Storage; patients: PatientStore }): Promise<InboxMessage[]> {
  if (!(await deps.patients.find(input.patientId))) throw new NotFoundError("Unknown patient");
  const events = await deps.storage.retrieve(input.patientId, input.pin);
  return events.filter(isDoctorMessage).map((e) => {
    const t = e.content.details?.text_patient;
    const usable = !e.content.needs_review && typeof t === "string" && t.trim() !== "";
    return { id: e.id, type: e.type, created_at: e.created_at, text: usable ? t : UNCLEAR_LABEL, needs_review: !usable };
  });
}

function isDoctorMessage(e: Event): e is Event & { type: InboxMessage["type"] } {
  return e.type === "doctor_diagnosis" || e.type === "doctor_prescription";
}
