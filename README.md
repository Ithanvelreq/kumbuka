# Kumbuka – small AI health ledger (hackathon demo)

A phone-accessible medical ledger for patients with basic phones. Persona: Noor, rural Ondera, Swahili speaker.
Full plan: [`docs/plan.md`](docs/plan.md).

- **Flow 1 – patient logs a symptom:** Swahili audio → Whisper (translate to English) → small LLM structures it → `symptom_log` event.
- **Flow 2 – doctor retrieves history:** all events → one LLM call → SMS-length summary in the doctor's language.
- **Flow 3 – doctor sends diagnosis/prescription:** typed or spoken → translated to English (stored) and Swahili (shown on the patient's phone), passed through in full.

English is the pivot language in the database. Translation only happens at the edges.

## What is live vs. planned (read this)

| | This demo (live) | Intended production design (planned) |
|---|---|---|
| Inference | **Cloud**: Groq API (`whisper-large-v3`, `llama-3.1-8b-instant`) | **Local** on a mini-PC: Whisper small + a small open LLM with a commercial license, on CPU |
| PIN login check | **Stub** (`NoOpPinCrypto`): any PIN is accepted, login only checks the ID exists | `pin_check` = ID encrypted with a PIN-derived key (PBKDF2/Argon2 + AES-GCM). The PIN is never stored |
| Data at rest | **Plaintext** (`PlainStorage`) | `EncryptedStorage`: content encrypted with a PIN-derived key |
| Doctor accounts | Not stored, local display name only | Real clinician accounts |
| Delivery | Browser phone simulator, button presses | Basic-phone telephony/SMS, one-time share codes |

Both stubs are swapped with **one line** in [`supabase/functions/_shared/infra/container.ts`](supabase/functions/_shared/infra/container.ts).

## Safety rules (enforced in code, not just prompts)

- The AI never diagnoses, prescribes, assesses severity, suggests causes or reassures. It only extracts or translates what was said. The rules are in every prompt ([`prompts.ts`](supabase/functions/_shared/infra/prompts.ts)).
- Every AI output is a draft. Uncertain entries get `needs_review: true` and are shown as **"Unclear, ask a person"**, with the English transcript visible to the clinician. Rules ([`needs-review.ts`](supabase/functions/_shared/domain/needs-review.ts)):
  low Whisper `avg_logprob` (< -0.8) or high `no_speech_prob` (> 0.5), LLM `confidence: "low"`, empty note or very short transcript, JSON parse/validation failure, and (for doctor messages) any number that changes in translation.
- **No audio is persisted.** Audio arrives as base64, is decoded in memory, sent to Whisper, and the buffer is zeroed right after transcription, even on failure. Nothing writes audio to disk, storage buckets or the DB.
- Minimal data: the summary prompt only sees date, type, note and flag, never raw transcripts.
- Every Groq call has a 15s timeout and one retry. 429/5xx/timeouts become HTTP 503, and the UI shows **"Service busy, try again"**.

## Architecture (hexagonal)

Import direction: **infra → use cases → domain**, never outward. `tests/architecture.test.ts` enforces this.

```
src/                                   phone simulator (Vite + React + Tailwind)
supabase/migrations/                   patients, events, synthetic seed (RLS on, no policies)
supabase/functions/
  _shared/domain/                      pure: types, schema (content validation), needs-review, ports, errors
  _shared/use-cases/                   ingest, retrieve, log-instruction, inbox, auth (import domain only)
  _shared/infra/                       Supabase storage, Groq transcriber/summarizer, prompts, HTTP, container
  ingest/ retrieve/ log-instruction/ inbox/ auth/   thin Deno handlers: parse → use case → JSON
```

Shared code lives under `_shared/` (underscore = not deployed as a function, per Supabase convention).
`inbox` isn't in the original plan. It's how the patient phone reads flow 3's messages.

### API

All functions are `POST` with a JSON body. Audio is `{ "base64": "...", "mime_type": "audio/webm" }`.

| Function | Body | Returns |
|---|---|---|
| `auth` | `{ action: "signup", id, pin, display_name? }` / `{ action: "login", id, pin }` | `{ patient }` |
| `ingest` | `{ patient_id, pin, audio, source_lang? = "sw" }` | `{ event }` |
| `retrieve` | `{ patient_id, pin, target_lang? = "en" }` | `{ summary, fallback, entries[] }` |
| `log-instruction` | `{ patient_id, pin, type, source_lang?, patient_lang? = "sw", text \| audio }` | `{ event }` |
| `inbox` | `{ patient_id, pin }` | `{ messages[] }` |

Errors: `400 invalid_input`, `404 not_found`, `503 service_busy`, `500 internal`.

## Setup

1. **Supabase / Lovable:** connect the project. Apply `supabase/migrations/*` in order: patients, events, then the synthetic seed.
2. **Secrets** (Lovable secrets / `supabase secrets set`, never in the repo):
   - `GROQ_API_KEY` (required, free tier at console.groq.com)
   - `GROQ_WHISPER_MODEL`, `GROQ_LLM_MODEL` (optional overrides; check Groq's live model list)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into edge functions.
3. **Deploy functions:** `supabase functions deploy ingest retrieve log-instruction inbox auth` (or let Lovable deploy them).
4. **Frontend:**
   ```sh
   npm install
   cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
   npm run dev            # http://localhost:8080
   ```
5. **Demo clips:** put pre-recorded Swahili clips in `public/clips/` and list them in `src/lib/clips.ts`.
   `silence.wav` (near-silent, generated) is included to show the `needs_review` fail-safe.

## Checks

```sh
npm test          # domain + use-case tests (Node test runner, no network)
npm run typecheck # frontend + domain/use-cases
npm run build
```

The infra and handler files use Deno `npm:` imports, so `tsc` doesn't check them. Run `deno check supabase/functions/*/index.ts` if Deno is installed.

## Demo script

1. Patient phone: log in as `demo-noor` (synthetic) with any 4-digit PIN, or sign up a fresh ID.
2. Patient: send a Swahili clip → "Imepokelewa ✓". Send `silence.wav` → "⚠ Unclear, ask a person".
3. Doctor phone: log in (any name + PIN), enter the patient ID and PIN, pick a language → **Retrieve history** shows an SMS-length summary plus flagged entries with their transcripts.
4. Doctor: send a prescription (typed or 🎤 spoken) → shows what the patient will see in Swahili.
5. Patient: **📥 Ujumbe** shows the doctor's message in Swahili.

## Demo-readiness checklist

- [ ] Whole loop from a fresh account: signup → log symptom → doctor retrieves → doctor sends instruction → patient sees it
- [x] One clip that triggers `needs_review` (`public/clips/silence.wav`)
- [x] No audio persisted (in-memory only, buffer zeroed after transcription; see `ingest.ts`, `log-instruction.ts`)
- [x] No secrets in the repo (`.env*` ignored; keys via Lovable/Supabase secrets)
- [x] README states live vs planned (table above)
- [ ] Real Swahili demo clips added to `public/clips/`

## Seed data

`demo-noor` and its three entries are **synthetic**, not a real person. One entry is pre-flagged `needs_review` so the fail-safe shows up on the first retrieval.
