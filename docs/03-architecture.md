# 03 — Architecture

**Status:** Draft
**Scope:** System structure, components, boundaries, data flow, and integration points.
**Source of truth:** [`PRD.md`](./PRD.md); domain details in
[`05-domain-model-ddd.md`](./05-domain-model-ddd.md); schema in
[`04-data-model.md`](./04-data-model.md).

---

## 1. Architectural overview

A **local-by-default, single-user, full-stack web app** with **platform-agnostic code**
(Q27 confirmed: developed/tested on macOS/Apple Silicon for now, no multi-platform CI for now):

```
┌────────────────────────────────────────────────────────────────┐
│ Browser — http://127.0.0.1:3000   (web server: loopback default)│
│  React 19 UI (TanStack Start): sidebar · chat · composer · draft│
│  Invokes server functions (loopback HTTP)                       │
└───────────────────────────────▲────────────────────────────────┘
                                │ server functions (createServerFn)
┌───────────────────────────────┴────────────────────────────────┐
│ Node server (Nitro + TanStack Start)                            │
│  server functions = the ONLY place DB + model live              │
│   • Thread/Msg repository (Drizzle)                             │
│   • AI orchestrator (prompt build, model call, errors)          │
│   • CV loader (reads data/context.md)                           │
└──────────┬──────────────────────┬───────────────────┬───────────┘
           │                      │                   │
     ┌─────▼─────┐        ┌───────▼─────────┐    ┌────▼─────────┐
     │  SQLite   │        │ @tanstack/ai-   │    │ data/        │
     │ (file by  │        │ openai client   │    │ context.md   │
     │ DATABASE_ │        └───────┬─────────┘    │ (user CV)    │
     │ URL)      │                │              └──────────────┘
     └───────────┘                │ OpenAI-compatible (configurable:
                                  │  OPENAI_BASE_URL — local default,
                             ┌────▼────────────────────────────┐   remote opt-in)
                             │ Model backend (any OpenAI-      │
                             │ compatible: oMLX / LM Studio /  │
                             │ llama.cpp / vLLM / hosted)      │
                             └─────────────────────────────────┘
```

**Key invariant:** the browser never touches the DB or the model. All privileged work is in
server functions. The only model hop is the call to the configured `OPENAI_BASE_URL` (local by
default; remote is a documented opt-in). Everything else is on-disk.

---

## 2. Components & responsibilities

| Component | Layer | Responsibility | Lives in |
|-----------|-------|----------------|----------|
| UI (sidebar, chat, composer, draft) | Client (React) | Rendering, local interaction state, calling server functions | `src/routes`, `src/components` |
| Server functions | Server (Nitro) | All DB reads/writes, AI orchestration, CV loading, validation | `src/server/*` (or `src/lib/server`) |
| Domain services | Server | Business rules: message ordering, thread invariants, prompt-assembly policy | `src/domain/*` |
| Repositories | Server | Drizzle queries; the only DB touchpoints | `src/db/*` |
| AI client wrapper | Server | Builds the prompt, calls `@tanstack/ai-openai` against the local endpoint, maps errors | `src/server/ai/*` |
| CV loader | Server | Reads `data/context.md`, enforces existence/non-empty policy | `src/server/context/*` |
| SQLite | Storage | The persistent, append-only record | `./<dbfile>` |
| Model backend | External | Any OpenAI-compatible endpoint (local by default, remote opt-in) | user-managed process |

---

## 3. Server-function boundaries (the security/privacy seam)

All privileged operations are `createServerFn`s. The client imports only the function handles.
Proposed server function surface (IDs referenced by specs):

| SF ID | Name | Input (zod) | Output | Notes |
|-------|------|-------------|--------|-------|
| SF-01 | `listThreads` | — | `ThreadSummary[]` | Sidebar data (name, company, last activity) — no status (Q3) |
| SF-02 | `createThread` | `{ recruiterName, company }` | `ThreadSummary` | Validates + persists (FR-02) |
| SF-03 | `getThread` | `{ threadId }` | `{ thread, messages[] }` | Full chronological history (FR-03) |
| SF-04 | `addMessage` | `{ threadId, role, body }` | `Message` | Append-only commit (FR-06) |
| SF-05 | `deleteThread` | `{ threadId }` | `ok` | **soft delete** (`is_deleted`); no archive/status (Q3/Q4) |
| SF-06 | `generateAnswer` | `{ threadId }` (streams) | `text` / stream | Orchestrates CV+thread→model (FR-08…12) |
| SF-07 | `getContextStatus` | — | `{ exists, nonEmpty, size }` | CV existence check (FR-14) |
| SF-08 | `getModelStatus` | — | `{ reachable: boolean }` | Live "model connected?" indicator (Q43, must-have; doc 06 §7.1) |

> The exact names/signatures are refined in each spec. `generateAnswer` is the only function
> that performs the model call.

---

## 4. Data flow

### 4.1 Create a thread
1. UI: "+" → dialog → submit `{recruiterName, company}`.
2. Client calls `SF-02 createThread`.
3. Server validates (zod), inserts via repository, returns the new thread summary.
4. Client updates sidebar + navigates to the new thread.

### 4.2 Load a thread
1. UI: select thread (route `/threads/:threadId`).
2. Client calls `SF-03 getThread`.
3. Server reads thread + messages ordered by `created_at` (tie-break per Q20/Q21).
4. Client renders chronologically.

### 4.3 Commit a message
1. UI: type body, set sender toggle, click commit.
2. Client calls `SF-04 addMessage` with `{threadId, role, body}`.
3. Server validates (non-empty, length cap NFR-10.2), inserts within a transaction, returns the
   stored message.
4. Client clears composer, appends to the list.

### 4.4 Generate an AI answer
1. UI: user clicks **"Generate AI Answer"** (explicit action — the only trigger, FR-08).
2. Client calls `SF-06 generateAnswer {threadId}`.
3. Server:
   a. Loads `data/context.md` (CV) — blocks with a clear error if missing/empty (Q22).
   b. Loads the thread's ordered messages.
   c. Assembles the prompt (system instruction + CV + messages) per
      [`06-ai-integration.md`](./06-ai-integration.md).
   d. Calls the model endpoint (`OPENAI_BASE_URL`) via `@tanstack/ai-openai` (low temperature).
   e. Streams/returns the draft; maps errors to typed, local-safe messages.
4. Client renders the draft in the **editable** field (not committed).
5. User edits → **Commit** (goes through `SF-04 addMessage` as a user message) or **Discard**.

> The draft itself is **not** persisted at generation time (staged review, FR-11 / Q17).

---

## 5. Configuration & environment

Server-side config is read from environment (env vars). The client never sees these.

| Env var | Purpose | Default | Status |
|---------|---------|---------|--------|
| `DATABASE_URL` | SQLite file path (set in `.env`; Q18 confirmed) | `dev.db` | confirmed |
| `OPENAI_BASE_URL` | Model endpoint root (local by default; remote opt-in) | `http://127.0.0.1:8080` | Q10 confirmed |
| `OPENAI_API_KEY` | API key (placeholder for local; real for remote) | `local` | Q10 confirmed |
| `OPENAI_MODEL_NAME` | Model identifier passed to the endpoint | — | Q9 |
| (optional) `OPENAI_TEMPERATURE`, `OPENAI_MAX_TOKENS`, `OPENAI_CONTEXT_WINDOW` | Generation params / overflow budget | `0.2` / `1024` / bounded | Q12/Q13 confirmed |

> **Confirmed (Q10/Q29):** the endpoint, key, and model are all user-configured via `OPENAI_*`.
> The app is local by default; a remote `OPENAI_BASE_URL` is a documented opt-in.

> **Q25 (confirmed):** the scaffold's leftover empty `ANTHROPIC_API_KEY` in `.env.local` is
> removed — the app uses `OPENAI_*` only.

---

## 6. Cross-cutting decisions

### 6.1 Where domain logic lives
- **Client:** presentation + interaction state only. No business rules.
- **Server (domain services):** invariants (ordering, immutability, prompt-assembly policy,
  CV-existence policy, validation). This is where the DDD aggregates are protected.
- **Repositories:** dumb data access (Drizzle). No business rules.

### 6.2 State management
- Server state is the source of truth; the client keeps a small local cache of the active
  thread (messages, composer, draft) and invalidates on server function results.
- Routing (active thread) is URL-driven (`/threads/:threadId`) for refresh-safety (FR-16).

### 6.3 Error handling strategy
- Server functions return **typed results** (`{ ok: true, data } | { ok: false, error }`) so the
  client can render specific, private, local-safe messages (no stack traces with CV content).
- AI errors are categorized: `endpoint_unreachable`, `timeout`, `model_error`, `context_missing`,
  `validation_error` (Q15 confirmed; doc 06 §7).

### 6.4 Concurrency
- Single user, single machine; SQLite writes are serialized. `generateAnswer` is guarded against
  duplicate in-flight calls per thread (NFR-04.4).

---

## 7. Mapping requirements → architecture

| Requirement | Satisfied by |
|-------------|--------------|
| NFR-01 (privacy) | Local-by-default `OPENAI_BASE_URL`, server-only DB/AI, no telemetry, prompt-safety guardrail (D3) |
| NFR-02 (security) | Web-server loopback default, server-side validation, prompt-injection-aware system prompt (input = data) |
| FR-01…04 (threads) | `SF-01..03`, `SF-05`, thread aggregate (doc 05) |
| FR-05…07 (messages) | `SF-04`, message entity, append-only repo |
| FR-08…12 (AI) | `SF-06`, AI orchestrator, doc 06 |
| FR-13…14 (CV) | CV loader, `data/context.md` |
| NFR-03 (performance) | Server-side heavy work, streaming generation, local reads |
| NFR-04 (integrity) | Transactional appends, order stability |

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Model endpoint not running / wrong `OPENAI_BASE_URL` | Typed `endpoint_unreachable`/`auth_error` + clear UI guidance; local default; setup doc (doc 07) |
| Prompt exceeds model context | Bounded assembly + overflow strategy (Q13) |
| Hallucinated CV facts | Strict system prompt + anchoring to two inputs only + low temperature (doc 06 §4) |
| `.env`/`.env.local` drift | Resolve to a single `DATABASE_URL` (Q18); document in doc 07 |
| Accidental remote call introduced | Privacy guardrail test (D3) |
| Prompt injection via pasted text | System prompt treats input as data; generation is explicit-action only |
| Scope creep (statuses, search, etc.) | Decided and closed: no status (Q3), no full-text search (Q7); out-of-scope list (doc 01 §7, Q39 confirmed) |
