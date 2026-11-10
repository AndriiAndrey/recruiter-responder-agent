# 02 — Non-Functional Requirements

**Status:** Draft
**ID scheme:** `NFR-##`
**Source of truth:** [`PRD.md`](./PRD.md)

Non-functional requirements (NFRs) define **how well** the system must behave — quality
attributes that are as binding as the functional ones. The privacy NFRs here are
**non-negotiable** (PRD §2 and AGENTS.md).

Open items are flagged `> [!OPEN Q##]` and tracked in
[`10-open-questions-and-decisions.md`](./10-open-questions-and-decisions.md).

---

## NFR-01 — Data privacy & local-by-default (NON-NEGOTIABLE core: no telemetry)

- **NFR-01.1:** All user data (chat history, CV, prompts, drafts, generated text) stays on the
  user's machine **by default**. The only outbound data flow is to the configured model endpoint
  (`OPENAI_BASE_URL`).
- **NFR-01.2:** The model endpoint is **local by default** (e.g., oMLX/MLX, LM Studio, llama.cpp on
  Apple Silicon). Pointing `OPENAI_BASE_URL` at a **remote** service is an explicit, documented user
  opt-in; it is then understood that prompt data (CV + messages) is sent to that service. No other
  outbound network calls are made.
- **NFR-01.3:** No telemetry, analytics, error reporting, crash reporting, or phone-home of any
  kind (no Sentry, no PostHog, no update pings). This is the hard non-negotiable.
- **NFR-01.4:** No remote API key is *required*. `OPENAI_API_KEY` is user-supplied only when using a
  remote endpoint. The scaffold's leftover empty `ANTHROPIC_API_KEY` is removed. (Q25 confirmed.)
- **Verification:** automated guard — see NFR-01.5 (Q24 confirmed).

## NFR-01.5 — Automated guardrail (Q24 confirmed)

> [!DECISION D3 (confirmed)] An automated guard (Vitest, run in `npm run test` and `npm run ci`)
> ensures:
> - **Prompt safety:** `PromptAssembler` wraps CV + message text as *data* (delimiters) and the
>   system prompt instructs the model to treat it as data, not commands — recruiter/CV text cannot
>   override instructions.
> - **No telemetry / no unexpected endpoints:** the only outbound model calls go to
>   `OPENAI_BASE_URL`; no SDK with phone-home/analytics is imported; no hardcoded unexpected
>   external endpoint.
>
> This guardrail does **not** block non-localhost model calls — a remote endpoint is an allowed,
> documented opt-in (Q23).

---

## NFR-02 — Security (local threat model)

- **NFR-02.1 — Binding (two distinct things) (D5):**
  - **Web app server:** binds to **loopback by default** (`127.0.0.1`) so the single-user app is
    not LAN-reachable; configurable via the dev/preview host if the user wants LAN access.
  - **Model endpoint:** `OPENAI_BASE_URL` is **configurable** — local by default, remote allowed as
    a documented opt-in (Q23 relaxed: no longer forced to loopback).
- **NFR-02.2 — No auth needed locally:** single-user app; no login/authorization in v1. If the web
  server is exposed on the LAN, that is the user's explicit choice; v1 has no auth layer.
- **NFR-02.3 — Input handling:** User input (pasted messages, CV) is treated as untrusted text.
  Server functions validate length/shape (zod) before persistence or prompt assembly. No
  executable content is ever run.
- **NFR-02.4 — Data at rest:** The SQLite file is a local file. No encryption at rest is
  required for v1. (Q26 confirmed: no encryption.)
- **NFR-02.5 — Prompt-injection awareness:** Recruiter-pasted text is untrusted and could
  contain instructions. The system prompt must treat recruiter/CV text as *data*, not
  *instructions*, and generation is always gated behind an explicit user action.

---

## NFR-03 — Performance & responsiveness

- **NFR-03.1 — UI responsiveness:** Core interactions (select thread, toggle sender, commit
  message) feel instant. Target: non-AI interactions render in < 100 ms on the reference
  machine (Apple M3 Max).
- **NFR-03.2 — Thread load:** Loading a thread's history is a local SQLite read. Target: < 50 ms
  for threads up to a few hundred messages.
- **NFR-03.3 — AI latency budget:** Generation latency is bounded by the local model. The UI
  must remain responsive during generation (streaming, Q11 confirmed), show progress, and allow
  abort. Target: first token/progress indicator within ~1 s of click when the model is loaded.
- **NFR-03.4 — No blocking main thread:** Heavy work (prompt assembly, model call, DB writes)
  happens in server functions, never in client render.

---

## NFR-04 — Reliability & data integrity

- **NFR-04.1 — Append-only integrity:** The message log is an append-only, chronologically
  ordered record. Writes use a single SQLite transaction per committed message.
- **NFR-04.2 — Crash safety:** A crash mid-commit must not leave a half-written message or
  corrupt the DB (SQLite transactions + WAL).
- **NFR-04.3 — Order stability:** Message order is stable and deterministic across loads (see
  Q20/Q21 for the timestamp + tie-break strategy).
- **NFR-04.4 — Idempotent generation:** Clicking Generate after an in-flight request is a no-op
  (guarded), preventing duplicate prompts.

---

## NFR-05 — Portability & platform

- **NFR-05.1 — Platform-agnostic code (Q27 confirmed):** The code must **not** be tied to a single
  platform — no macOS-only APIs, no hard assumptions about OS-specific paths/tools in domain or
  server code. For now the app is **developed and tested only on macOS/Apple Silicon** (the model
  typically runs there); a multi-platform CI is **not required for now** and can be added later
  without changing the code. The web stack (Node + browser) is inherently cross-platform; keep it
  that way (e.g., `better-sqlite3` file paths via `DATABASE_URL` only).
- **NFR-05.2 — Runtime:** Node.js **>= 22** (Q28 confirmed). Enforce with an `engines` field in
  `package.json` + a `.nvmrc` (slice 0 action).
- **NFR-05.3 — No external runtime dependencies at run time** beyond Node, the model
  process, and local libraries. No required cloud accounts or services.

---

## NFR-06 — Maintainability & code quality

- **NFR-06.1 — Lint/format gate:** `npm run check` (Biome) must pass; formatting per `biome.json`
  (2-space indent, single quotes for JS, double for JSX attributes, line width 80);
  `routeTree.gen.ts` and `styles.css` are not hand-edited.
- **NFR-06.2 — Type safety:** TypeScript `strict` mode; no `any` in domain/server code.
- **NFR-06.3 — Server/client boundary:** All DB and model access lives in server functions.
  Client components never import `better-sqlite3` or call the model directly.
- **NFR-06.4 — Domain structure:** Code is organized by domain (see
  [`05-domain-model-ddd.md`](./05-domain-model-ddd.md)), not by technical layer alone, so the
  model stays legible.
- **NFR-06.5 — Test coverage:** Logic touched by a change is covered by tests per
  [`09-testing-strategy.md`](./09-testing-strategy.md). Coverage target per Q36.

---

## NFR-07 — Usability & UX

- **NFR-07.1 — Minimalist, high-performance UX** (PRD §2): single-pane, purpose-built for
  fast copy-paste → edit → commit workflows.
- **NFR-07.2 — Clarity of provenance:** At a glance, a user can tell which messages are from
  the recruiter vs the user, and which text is an uncommitted AI draft.
- **NFR-07.3 — Graceful empty states:** First-run (no threads, no CV) shows clear, actionable
  guidance, not blank screens.
- **NFR-07.4 — Accessibility:** Semantic HTML, keyboard-operable, sufficient contrast, focus
  management on dialog open/close.
- **NFR-07.5 — i18n:** English only for v1 (Q33 confirmed).

---

## NFR-08 — Compatibility & determinism (AI-specific)

- **NFR-08.1 — Endpoint contract:** The app talks to an **OpenAI-compatible** local endpoint
  via `@tanstack/ai-openai`. The base URL and model are **server-side config only** (env vars),
  never exposed to or edited from the client.
- **NFR-08.2 — Endpoint config:** `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME` are
  **server-side config only** (never exposed to or edited from the client). Local by default;
  remote is a documented user opt-in (Q10, Q23, Q29).
- **NFR-08.3 — Determinism:** Low/controlled generation parameters (Q12 confirmed):
  `temperature 0.2`, `top_p 1`, `max_tokens 1024`, configurable via env, so repeated runs are
  stable and grounded.
- **NFR-08.4 — Bounded context:** The prompt is bounded by the model's context window with a
  defined overflow strategy (Q13).

---

## NFR-09 — Observability (local, private)

- **NFR-09.1 — Local logs only:** Any logging goes to the local console/server logs. Nothing is
  shipped off-machine.
- **NFR-09.2 — Debuggability:** Server functions log enough (at a debug level) to diagnose
  generation failures locally (prompt length, model, timing) **without** logging the full CV or
  private message bodies (Q42 confirmed: logs carry lengths/hashes, never bodies).

---

## NFR-10 — Capacity & limits (assumed, confirm)

- **NFR-10.1 — Scale assumptions:** Single user; tens to low hundreds of threads; a few hundred
  messages per thread; CV file up to a few hundred KB. The design must be comfortable at this
  scale (SQLite is trivially adequate).
- **NFR-10.2 — Message size limit:** Enforce a max message body length of **32 KB** (zod)
  (Q21 confirmed) to guard the prompt and the DB.
