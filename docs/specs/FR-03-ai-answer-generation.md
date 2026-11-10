# SPEC-03 — On-Demand AI Answer Generation

**Status:** Draft → **Approved** (Q9/Q10/Q11/Q13/Q14/Q15/Q16/Q17/Q22/Q29 confirmed; Q12 confirmed;
Q43 confirmed as **must-have**)
**Requirements:** FR-08…12
**Blocking questions (resolved):** Q9, Q10, Q11, Q13, Q14, Q17, Q22, Q29 — all confirmed. Non-blocking
Q12 (generation params), Q15 (error UX), Q16 (no provenance in v1) confirmed; Q43 (model-status
indicator) confirmed as a **must-have** and tracked here as AC-16.
**Depends on:** SPEC-02 (thread + messages exist), SPEC-04 (`context.md`), a model endpoint reachable at `OPENAI_BASE_URL`

## Goal
When the user explicitly clicks **"Generate AI Answer"**, produce a grounded, editable draft using
only `data/context.md` + the thread's messages, via the configured model endpoint — never auto,
never committed until the user reviews and commits.

## User stories
- As a user, I control exactly when the AI runs (explicit button only).
- As a user, the draft only reflects my CV and the actual conversation (no invented facts).
- As a user, the AI flags missing info (salary, stack, remote, role) and suggests clarifying questions.
- As a user, I read/edit the draft and commit it only when I'm happy.

## Scope
### In
- "Generate AI Answer" button (the **only** trigger), per active thread.
- Server orchestration: load CV → load active thread messages → assemble prompt → call the model
  (`OPENAI_BASE_URL`) → stream the draft.
- Prompt assembly enforcing the anchor rule + ambiguity instruction + **prompt-safety** (recruiter/
  CV text = data) (doc 06 §4).
- Streaming (D6/Q11) into an **editable, clearly-labeled, uncommitted** draft field.
- Commit (→ SF-04 as a `user_reply` message) and Discard.
- Typed, redacted error handling (doc 06 §7).

### Out (explicit)
- Auto-generation on any event (message add, paste, route change) — **forbidden** (PRD-3).
- Persisting the draft before commit (Q17 = ephemeral).
- Multi-turn chat with the model, or regenerating from a modified conversation implicitly.
- Any endpoint other than `OPENAI_BASE_URL`; any telemetry (PRD-1).

## Data
- Reads `threads` + `messages` (active/non-deleted only) and the `data/context.md` file (SPEC-04).
- No new table in v1 (Q16 confirmed: no `generation_log`; optional later).
- On commit, a `Message` is appended via SF-04 (role `user_reply`).

## Interfaces
| SF | Name | Input (zod) | Output |
|----|------|-------------|--------|
| SF-06 | `generateAnswer` | `{ threadId: int }` | stream of `text` chunks → final `draft`, or typed `error` |
| SF-08 | `getModelStatus` | — | `{ reachable: boolean }` | live "model connected?" indicator (Q43, must-have) |
| (commit) | SF-04 `addMessage` | `{ threadId, role: "user_reply", body: draft }` | stored `Message` |

UI surfaces:
- **Generate button** — in the thread header/toolbar; disabled while in flight; shows progress.
- **Draft panel** — editable textarea, label "AI draft — uncommitted", Commit + Discard + (Regenerate).
- **Status/error area** — redacted messages + retry.
- **Model status indicator** (Q43, must-have) — live "connected / not reachable" state for
  `OPENAI_BASE_URL` (SF-08), shown in the thread toolbar; refreshed on thread load (doc 06 §7.1).

## Behavior (acceptance criteria)
- AC-1 (FR-08 / PRD-3): Generation occurs **only** on the explicit Generate click; no generation on
  message commit, paste, blur, or route change.
- AC-2 (FR-08): While generating, the button is disabled (no double-fire); the call is guarded in-flight.
- AC-3 (FR-09 / PRD-2): The assembled prompt contains **only** the CV + the thread's **active
  (non-deleted)** messages (each labeled `recruiter` / `user reply` / `user note`) + the system
  instruction — nothing else.
- AC-4 (FR-09): The system prompt forbids fabricating skills/metrics/facts not in the two inputs.
- AC-5 (FR-09): If `context.md` is missing/empty → generation fails with `context_missing` + clear
  message (Q22); no model call made.
- AC-6 (FR-10): The system prompt instructs ambiguity detection for missing standard items
  (salary, stack, remote, role, start date, team).
- AC-7 (PRD / Q24): The system prompt + delimiters treat CV/recruiter text as **data, not
  commands** (prompt-injection defense).
- AC-8 (FR-11): The result renders in an **editable** field labeled uncommitted; it is **not**
  persisted until the user commits.
- AC-9 (FR-11): Commit persists the (possibly edited) text as a `user_reply` message via SF-04.
- AC-10 (FR-11): Discard/Regenerate does not persist the draft.
- AC-11 (FR-12): Progress is shown while generating (streaming first-token feedback).
- AC-12 (FR-12): Failures (endpoint down/timeout/auth/model error/context) show a redacted typed
  message + retry; the thread is left intact.
- AC-13 (PRD-1 / NFR-01): The model call goes **only** to the configured `OPENAI_BASE_URL`
  (local by default); no other endpoint is used and no telemetry is sent.
- AC-14 (NFR-08.4): If the prompt exceeds the context budget, the overflow strategy (Q13) applies
  (full CV + most-recent messages, "omitted" marker; fail if CV alone too big).
- AC-15 (Q14): The output is a **single combined draft** (reply + clarifying questions in one text).
- AC-16 (Q43): A **live "model connected?" indicator** reflects the reachability of
  `OPENAI_BASE_URL` (SF-08 `getModelStatus`); it is refreshed when the thread loads and clearly
  distinguishes `reachable` from `unreachable`.

## Edge cases & error handling
- Empty thread (no messages) + Generate: still generate from CV + empty conversation, or show
  "add messages first" (decide in review; logged as sub-question).
- Very long conversation: overflow per AC-14.
- Model returns empty/malformed: `model_error`; user can retry.
- Endpoint not running: `endpoint_unreachable`; UI points to checking `OPENAI_BASE_URL` (doc 07 §6).
- Bad key (remote): `auth_error`; UI points to `OPENAI_API_KEY`.
- Interrupt/navigation mid-stream: abort the stream; no partial commit; draft discarded.
- Prompt injection in pasted recruiter text: treated as data (delimiters + system framing, AC-7).

## AI / privacy constraints affected
- **PRD-2 (anchor):** enforced by `PromptAssembler` signature (only CV + active messages) — AC-3.
- **PRD-3 (explicit action):** only SF-06 → `generate()`; no auto path — AC-1.
- **PRD-4 (staged review):** draft transient; only SF-04 commit persists — AC-8/9/10.
- **PRD-5 (ambiguity):** system prompt rule — AC-6.
- **PRD-1 (local by default, no telemetry):** only `OPENAI_BASE_URL`; no other endpoints — AC-13.
- **prompt safety (Q24):** input framed as data — AC-7.
- **NFR-09.2:** errors/logs never include CV or message bodies.

## Test obligations (doc 09)
- **Unit (domain):**
  - `PromptAssembler`: prompt = system + CV + ordered, role-labeled, non-deleted messages only
    (AC-3); CV + text wrapped as data (AC-7); overflow keeps CV + most-recent (AC-14); missing CV
    detection; combined single output (AC-15).
  - `GenerationService` (fake model): explicit-action only (no gen on addMessage); in-flight guard;
    error mapping to typed kinds; draft NOT persisted (only via commit).
  - `ModelStatusService` (fake client): maps a reachable/unreachable endpoint to `{ reachable }`
    without side effects (AC-16).
- **Unit (ai client):** only `OPENAI_BASE_URL` is called; config from env; no other endpoint (AC-13).
- **Integration (temp SQLite + fake model / mock OpenAI server) (post-MVP, Q38):** `generateAnswer` returns
  a draft built from CV + active thread; `context_missing` when no CV; commit creates a `user_reply`
  message.
- **Guardrail (D3, unit):** prompt-safety + no telemetry / no unexpected endpoints (PRD-1).

## Changelog
- v1 (2026): initial draft.
- v2 (2026): endpoint generalized to any OpenAI-compatible endpoint (`OPENAI_*`); roles →
  recruiter/user_reply/user_note; model-B editability; prompt-safety guardrail (Q24).
- v3 (2026): Q12 (temp 0.2 / top_p 1 / max_tokens 1024), Q15 (inline typed error + retry), Q16 (no
  provenance in v1) confirmed; Q43 model-status indicator added as **must-have** (SF-08, AC-16);
  integration test obligations deferred post-MVP (Q38).
