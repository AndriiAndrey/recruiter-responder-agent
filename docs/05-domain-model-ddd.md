# 05 — Domain Model (Domain-Driven Design)

**Status:** Draft → **Approved** (core model confirmed; Q5a/Q5b residuals noted)
**Purpose:** Make the business explicit so the code structure mirrors it. This is the DDD half of
our methodology (the SDD half is the specs in [`specs/`](./specs/README.md)).

The system is small, so it is **one bounded context** with a clear **core domain**. We still apply
DDD discipline (ubiquitous language, aggregates, invariants, domain services/events) because it
keeps the model honest and the (now) editable-record rules enforceable.

---

## 1. Bounded context

**Context: `RecruitmentCorrespondence`** — "track and respond to technical recruiters using a
CV-anchored AI assistant."

- **Core subdomain:** drafting grounded replies + maintaining an accurate conversation record.
- **Supporting subdomain:** thread/workspace management, CV context management.
- **Generic / out of scope:** LinkedIn integration, multi-user. (A **remote** model endpoint is an
  external *service* the user may opt into via `OPENAI_BASE_URL` — see doc 02 NFR-01.)

There is **one** bounded context. The model endpoint (any OpenAI-compatible server) is an external
non-domain *service* — we only call it; it has no business meaning of its own.

### Context map

```
        [ RecruitmentCorrespondence ]  (single context = the whole app)
                      │
                      │ uses (anti-corruption: typed prompt/response)
                      ▼
        [ Model Endpoint ]  (external, non-domain: any OpenAI-compatible server,
                             local by default via OPENAI_BASE_URL)
```

---

## 2. Ubiquitous language (glossary)

These terms are used **exactly** in code, tests, and specs. They *are* the domain.

| Term | Definition | Code hint |
|------|-----------|-----------|
| **Thread (Chat)** | An isolated conversation channel with a single recruiter, shown as a tab title (recruiter + company). One **main, linear** conversation per Thread; no sub-threads, no status, soft-deletable. | `Thread` aggregate |
| **Recruiter (Opponent)** | The person on the other side; a message's `recruiter` role. | `MessageRole.recrutier` |
| **Message** | One chronological, committed entry in a Thread, authored by the recruiter or the user. Editable and deletable. | `Message` entity |
| **Sender / Role** | Who a Message is from: `recruiter`, `user_reply`, or `user_note`. | `MessageRole` enum |
| **Reply** | The user's own sent reply (`user_reply`). | `MessageRole.user_reply` |
| **Note** | The user's private note (`user_note`). Still part of the AI context (Q6). | `MessageRole.user_note` |
| **Draft** | An AI-generated, **uncommitted**, editable reply. Not yet a Message. | `Draft` (transient VO) |
| **Commit** | The explicit act that turns a reviewed Draft (or typed text) into a permanent Message. | `commitMessage()` |
| **CV Context** | The user's single source of truth: the contents of `data/context.md`. | `CvContext` VO (from file) |
| **Generation** | One explicit, on-demand invocation of the model producing a Draft. | `generate()` |
| **Clarifying question** | A question the AI proactively drafts for information the recruiter omitted. | part of `Draft` |
| **Ambiguity** | Missing standard info (salary, stack, remote, role expectations) in a recruiter request. | detection output |
| **Anchor** | The rule that a Generation may use *only* the CV Context + the Thread's Messages. | `assemblePrompt()` |

> Terminology is a **living decision**: if a term changes, we rename it everywhere (code, tests,
> specs) in the same change.

---

## 3. Aggregates

### 3.1 Aggregate: `Thread` (root)

**Invariants (must always hold):**
- `I1` Recruiter name and company are non-empty.
- `I2` A Thread's Messages are ordered by `created_at` (ties by `id`); a message's position is set
  at creation and is unchanged by edits.
- `I3` Every Message has a valid `role` and a non-empty body within the size cap.
- `I4` (Q5/Q5a/Q5b) Messages are **editable (all roles) and soft-deletable**: edits keep `created_at`;
  deletes set `is_deleted` (recoverable).
- `I5` A Generation (Draft) may only be produced from this Thread's **non-deleted** Messages + the
  CV Context (the *anchor* rule) — never from other threads or sources.
- `I6` Only **non-deleted** messages appear in the thread view and in the AI context.
- `I7` (Q3/Q4) A Thread has **no status** and is **soft-deletable only** (no archive, no hard
delete); a deleted Thread is excluded from all listings.

**Aggregate behavior (domain methods):**
```ts
class Thread {
  static create(recruiterName: string, company: string): Thread              // enforces I1
  addMessage(role: MessageRole, body: string, at: TimestampMs): Message      // enforces I3, appends
  editMessage(id: MessageId, body: string, at: TimestampMs): Message         // enforces I3; keeps position (I2)
  deleteMessage(id: MessageId): void                                          // soft delete (I4)
  activeMessages(): ReadonlyArray<Message>                                    // non-deleted, ordered (I2/I6)
}
```

> The domain does **not** know about React, SQL, or the model. It knows only these rules.
> Repositories persist it; server functions orchestrate it.

### 3.2 Entity: `Message`

- Identity: `id` (+ `threadId` for persistence).
- State: `role`, `body`, `createdAt`, `updatedAt?`, `isDeleted`.
- Behaviors: `displaySender()`, `isFromRecruiter()`, `isDeleted()`, `toPromptLine()` (role label +
  body, used by the PromptAssembler).
- **Mutable**: body can be updated (`updatedAt` set); it can be soft-deleted (Q5).

### 3.3 Value objects

| VO | Composition | Invariants |
|----|-------------|-----------|
| `MessageRole` | `recruiter \| user_reply \| user_note` (Q6) | closed enum; **all three** are in the AI context |
| `CvContext` | the markdown string of `data/context.md` | non-empty when a Generation runs (Q22) |
| `Draft` | `text: string`, `source: "ai"`, `producedAt` | never auto-persisted; becomes a `Message` only on explicit Commit |
| `GenerationRequest` | `{ threadId }` | the only trigger is an explicit user action (FR-08) |
| `GenerationResult` | `{ ok, draft?, error? }` with typed `error` (doc 06 §7) | local-safe, no CV leakage in error text |
| `ThreadSummary` | `{ id, recruiterName, company, lastActivity, isDeleted }` | read-model for the sidebar/tab (active = non-deleted) |

---

## 4. Domain services

Stateless operations that span more than one aggregate or that are policy the aggregates don't
own. These live on the **server** and are where the DDD rules are *enforced*.

| Service | Responsibility | Enforces |
|---------|----------------|----------|
| `PromptAssembler` | Builds the model prompt from `CvContext` + active (non-deleted) `Thread` messages + system instruction; applies the anchor rule and overflow strategy (Q13). Labels each message by its role (`recruiter` / `user reply` / `user note`). | I5, I6, NFR-08.4 |
| `GenerationService` | Orchestrates: load CV (exists?) → load thread → assemble → call model → map to `GenerationResult`. Owns the "explicit action only" and "no auto-generation" policy. | FR-08, FR-09, I5, NFR-04.4 |
| `CvContextService` | Reads `data/context.md`, reports `{exists, nonEmpty, size}`, enforces the missing/empty policy (Q22). | FR-13, FR-14 |
| `ModelStatusService` | Lightweight reachability probe of the configured `OPENAI_BASE_URL` (SF-08); maps the result to `{ reachable }` for the live "model connected?" indicator (Q43, must-have). | FR-12 (Q43), NFR-01 (same endpoint only) |
| `MessagePolicy` | Validation for add/edit (non-empty, length cap, valid role) and the soft-delete rule. | I3, I4, I6, NFR-10.2 |
| `ThreadPolicy` | Creation + soft-delete rules (no status; no uniqueness constraint). | I1, I7, Q2/Q3/Q4 |

> Services are the *only* place the model is called and the *only* place invariants are checked.
> Repositories and controllers never bypass them.

---

## 5. Domain events

Events are **local** (in-process / for UI + optional audit), not distributed. They make the
editable-record nature explicit and give us hooks for future features.

| Event | Raised on | Meaning |
|-------|-----------|---------|
| `ThreadCreated` | `Thread.create` + persist | A new channel exists |
| `MessageCommitted` | `commitMessage`/`addMessage` success | An entry was added to the record |
| `MessageEdited` | `editMessage` | A message body changed (audit) |
| `MessageDeleted` | `deleteMessage` | A message was (soft) deleted (audit) |
| `GenerationRequested` | explicit Generate click | A user-initiated generation started |
| `GenerationSucceeded` | model returned a draft | A draft was produced (uncommitted) |
| `GenerationFailed` | model/endpoint error | A typed failure (local-safe) |
| `DraftCommitted` | user commits a draft | A reviewed draft became a `Message` |
| `ThreadDeleted` | Thread soft-deleted (Q4) | Chat hidden (no archive) |

> At minimum, `MessageCommitted`/`MessageEdited`/`MessageDeleted` and the `Generation*` events
> document the editable-record + staged-review invariants and make them testable.

---

## 6. Repositories (persistence, server-only)

| Repository | Interface | Notes |
|------------|-----------|-------|
| `ThreadRepository` | `list()`, `get(id)`, `create(thread)`, `softDelete(id)` | Returns domain objects, not raw rows; `list()` filters `is_deleted = false` |
| `MessageRepository` | `append(message)`, `update(message)`, `softDelete(id)`, `listActiveByThread(id)` ordered | Filters `is_deleted = false`; cascade + ordering SQL here |

Repositories are the **only** Drizzle touchpoints. They map rows ⇄ domain objects.

---

## 7. Enforcing the non-negotiables in the domain

| Constraint | Where it lives in the model |
|------------|-----------------------------|
| **2. CV single source of truth** | `PromptAssembler` uses **only** `CvContext` + active `Thread.messages()`; no other input is accepted (compile-time: the function signature takes exactly those). |
| **3. Explicit-action only** | `GenerationService.generate()` is reachable **only** from the `GenerateAnswer` server function; there is no auto-invocation path. |
| **4. Staged review** | `Draft` is a transient VO; the only persistence path for it is the explicit `commitMessage` that creates a `Message`. No `saveDraft` in v1 (Q17). |
| **6. Sequential logging (editable)** | `MessageRepository.append/update/softDelete` + `I2` ordering + `I4`/`I6` (editable, soft-deleted excluded). |
| **5. Ambiguity detection** | Part of the `PromptAssembler` system instruction + the `GenerationResult.draft` content (doc 06 §4). |

---

## 8. Code structure (DDD layout)

Proposed `src/` layout (domain-first, server-only privileged code):

```
src/
  domain/
    thread/
      thread.ts            # Thread aggregate + invariants (incl. edit/delete)
      message.ts           # Message entity + MessageRole (recruiter/user_reply/user_note)
      events.ts            # domain events (incl. MessageEdited/Deleted)
    generation/
      generation.service.ts# GenerationService (orchestrates)
      prompt-assembler.ts  # PromptAssembler (anchor rule + role labels)
      types.ts             # GenerationRequest/Result, error kinds
    context/
      cv-context.ts        # CvContext VO
  server/
    ai/
      model-client.ts      # @tanstack/ai-openai wrapper, OPENAI_* config
    context/
      cv-context.service.ts# CvContextService (reads data/context.md)
    fns/                   # createServerFn surface (SF-01..08)
      threads.ts
      messages.ts
      generation.ts
  db/
    schema.ts              # threads + messages (doc 04)
    index.ts               # drizzle instance
    repositories/
      thread.repository.ts
      message.repository.ts
  components/              # shadcn UI (client)
  routes/                  # TanStack Start routes (client)
  lib/                     # cn, shared small utils (client-safe)
```

**Rule:** `domain/` has **no** imports from `db/`, `server/ai/`, or React. It is pure and fully
unit-testable without SQLite or a model. `server/` is the only layer that touches Drizzle and the
model client. `routes/` + `components/` are the only client layer.

---

## 9. Decisions (summary, confirmed)

- **D1 (Model B, confirmed):** messages are **editable (all roles, Q5a) and soft-deletable (Q5b)**.
  Position is fixed by `created_at`; edits set `updatedAt`; deletes set `is_deleted`.
- **D2 (confirmed):** no separate `recruiters` table — threads carry `recruiter_name` + `company`
  directly; no uniqueness constraint (Q2).
- **D7 (confirmed):** each chat is **one main, linear Thread**; **no status, no archive**; Threads
  are **soft-deletable only** (Q3/Q4).
- **MessageRole set (Q6, confirmed):** `recruiter | user_reply | user_note`; **all three** are in
  the AI context.

Consolidated in [`10-open-questions-and-decisions.md`](./10-open-questions-and-decisions.md).
