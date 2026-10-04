// Summarizer port via a small Groq instruct model in JSON mode.
import type { InstructionTranslation, RawStructured, Summarizer } from "../domain/ports.ts";
import type { Event } from "../domain/types.ts";
import { groqChatJson } from "./groq-http.ts";
import { formatHistory, STRUCTURE_SYMPTOM_SYSTEM, summarizeHistorySystem, translateInstructionSystem } from "./prompts.ts";

export class GroqSummarizer implements Summarizer {
  structureSymptom(transcriptEn: string): Promise<RawStructured> {
    return groqChatJson(STRUCTURE_SYMPTOM_SYSTEM, `Transcript:\n"""${transcriptEn}"""`);
  }

  async summarizeHistory(events: Event[], targetLang: string): Promise<string> {
    const out = (await groqChatJson(summarizeHistorySystem(targetLang), `History (oldest first):\n${formatHistory(events)}`)) as {
      summary?: unknown;
    };
    if (typeof out?.summary !== "string") throw new Error("summary missing");
    return out.summary;
  }

  async translateInstruction(text: string, sourceLang: string, patientLang: string): Promise<InstructionTranslation> {
    const out = (await groqChatJson(translateInstructionSystem(sourceLang, patientLang), `Doctor's message:\n"""${text}"""`)) as Record<string, unknown>;
    if (typeof out?.text_en !== "string" || typeof out?.text_patient !== "string") throw new Error("translation missing");
    const c = out.confidence;
    return { text_en: out.text_en, text_patient: out.text_patient, confidence: c === "high" || c === "medium" || c === "low" ? c : null };
  }
}
