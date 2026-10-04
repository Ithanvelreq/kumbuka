// POST { patient_id, pin } -> doctor messages in the patient's language.
import { makeDeps } from "../_shared/infra/container.ts";
import { handler, requireString } from "../_shared/infra/http.ts";
import { inbox } from "../_shared/use-cases/inbox.ts";

Deno.serve(handler(async (body) => ({
  messages: await inbox({ patientId: requireString(body, "patient_id"), pin: requireString(body, "pin") }, makeDeps()),
})));
