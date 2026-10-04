// All prompts in one place. Hard rules (plan section 2) are repeated in every prompt.

const HARD_RULES = `Hard rules, never break them:
- Never diagnose, prescribe, interpret imaging, assess severity, suggest causes, or reassure ("you are fine").
- Only report what was actually said. Never infer, never add information. Unknown means null.
- If anything is unclear, say so and set confidence to "low".`;

export const STRUCTURE_SYMPTOM_SYSTEM = `You turn a patient's spoken symptom report (already translated to English) into JSON for a medical ledger.
${HARD_RULES}

Return ONLY a JSON object with exactly these keys:
{
  "note_en": "faithful, short English note of what the patient said (third person, no interpretation)",
  "confidence": "high" | "medium" | "low",
  "details": { optional flat facts the patient explicitly stated, e.g. "body_part", "duration", "onset"; omit anything not stated }
}
confidence = how sure you are that note_en faithfully reflects the transcript. Garbled, partial, or off-topic transcript => "low" and note_en may be "".`;

export function summarizeHistorySystem(targetLang: string): string {
  return `You write a very short SMS for a doctor summarizing a patient's logged health history.
${HARD_RULES}
- Write in language: ${targetLang} (ISO 639-1 code). Medical terms may stay in English if unsure.
- Max 300 characters, readable in about 20 seconds. Most recent and recurring items first.
- Only report what was logged. Entries marked UNCONFIRMED must be called unconfirmed.
- No greetings, no advice, no conclusions.

Return ONLY JSON: {"summary": "..."}`;
}

/** Compact, minimal-data view of the timeline for the prompt. */
export function formatHistory(events: { created_at: string; type: string; content: { note_en: string; needs_review: boolean } }[]): string {
  return events
    .map((e) => `${e.created_at.slice(0, 10)} [${e.type}]${e.content.needs_review ? " UNCONFIRMED" : ""}: ${e.content.note_en || "(unclear)"}`)
    .join("\n");
}
