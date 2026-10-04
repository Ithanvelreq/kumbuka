// Summarizer port via a small Groq instruct model in JSON mode.
import type { RawStructured, Summarizer } from "../domain/ports.ts";
import { groqChatJson } from "./groq-http.ts";
import { STRUCTURE_SYMPTOM_SYSTEM } from "./prompts.ts";

export class GroqSummarizer implements Pick<Summarizer, "structureSymptom"> {
  structureSymptom(transcriptEn: string): Promise<RawStructured> {
    return groqChatJson(STRUCTURE_SYMPTOM_SYSTEM, `Transcript:\n"""${transcriptEn}"""`);
  }
}
