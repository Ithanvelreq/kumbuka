// Summarizer port via a small Groq instruct model in JSON mode.
import type { RawStructured, Summarizer } from "../domain/ports.ts";
import type { Event } from "../domain/types.ts";
import { groqChatJson } from "./groq-http.ts";
import { formatHistory, STRUCTURE_SYMPTOM_SYSTEM, summarizeHistorySystem } from "./prompts.ts";

export class GroqSummarizer implements Pick<Summarizer, "structureSymptom" | "summarizeHistory"> {
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
}
