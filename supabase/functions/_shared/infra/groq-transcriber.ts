// Transcriber port via Groq Whisper (translations endpoint: any language -> English).
// Audio exists only in memory for the duration of the request; nothing is written anywhere.
import type { AudioInput, Transcriber } from "../domain/ports.ts";
import type { Transcript } from "../domain/types.ts";
import { groqFetch, WHISPER_MODEL } from "./groq-http.ts";

interface VerboseJson {
  text?: string;
  segments?: { avg_logprob?: number; no_speech_prob?: number }[];
}

const EXT: Record<string, string> = {
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/flac": "flac",
};

export class GroqTranscriber implements Transcriber {
  async translateToEnglish(audio: AudioInput, _sourceLang: string): Promise<Transcript> {
    // The translations endpoint auto-detects the source language; sourceLang is kept for the port contract.
    const mime = audio.mimeType.split(";")[0];
    const res = (await groqFetch("/audio/translations", () => {
      const form = new FormData();
      form.append("file", new Blob([audio.bytes], { type: mime }), `clip.${EXT[mime] ?? "webm"}`);
      form.append("model", WHISPER_MODEL);
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
      return form;
    })) as VerboseJson;

    return {
      text_en: (res.text ?? "").trim(),
      segments: (res.segments ?? []).map((s) => ({
        avg_logprob: s.avg_logprob ?? -Infinity,
        no_speech_prob: s.no_speech_prob ?? 1,
      })),
    };
  }
}
