# SPEC-01 — Thread & Chat Management

**Status:** **Approved** (Q1/Q2/Q3/Q4/Q7/Q31 confirmed)
**Requirements:** FR-01…04, FR-15, FR-16
**Blocking questions (resolved):** Q1 (single-user, no auth), Q2 (one chat per thread; no uniqueness
constraint), Q3 (no status), Q4 (soft-delete only, no archive), Q7 (no full-text search; sort by
last activity, then name), Q31 (desktop-first only) — all confirmed.
**Depends on:** slice 0 (schema `threads`/`messages`, `.env`, DDD layout)

## Goal
Let the user create isolated conversation channels (chats) per recruiter, see them all in a
persistent sidebar, and open any one to view its full history. Each chat is a **single, linear
thread** with **no status** and a **soft-delete** lifecycle.

## User stories
- As a user, I can see all my recruiter conversations in one sidebar so I can track multiple loops.
- As a user, I can create a new chat by entering a recruiter's name and company (the tab title).
- As a user, I can open a chat and immediately see the whole conversation in order.
- As a user, I can soft-delete a chat I no longer need.

## Scope
### In
- Sidebar list of chats (recruiter name + company), sorted by last activity, then name (Q7 confirmed).
- "+" create dialog (recruiter name, company), validation, persistence, selection.
- Chat selection loads its full chronological history (delegates message rendering to SPEC-02).
- App shell layout + URL-driven routing (`/chats/:threadId`).
- **Soft-delete** a chat (Q4 confirmed) with confirmation. **No archive, no status.**

### Out (explicit)
- Thread **status** (active/archived/pipeline) — not present (Q3).
- **Archive** — not present (Q4).
- **Sub-threads / branching / multiple threads per chat** — each chat is one linear thread.
- Full-text search / filtering (Q7 confirmed: out of v1; sort only).

## Data
- Table: `threads` (doc 04 §2). Invariants: `I1` non-empty name+company; `I7` no status,
  soft-deletable only.
- **Q2/Q3/Q4 (confirmed):** each chat is **one main, linear Thread** (the tab); no uniqueness
  constraint on (recruiter, company); **no status**; the only lifecycle action is a **soft delete**
  (`threads.is_deleted`). `messages` render is owned by SPEC-02.

## Interfaces
| SF | Name | Input (zod) | Output |
|----|------|-------------|--------|
| SF-01 | `listChats` | — | `ThreadSummary[]` (id, recruiterName, company, lastActivity) — non-deleted only |
| SF-02 | `createThread` | `{ recruiterName: non-empty ≤200, company: non-empty ≤200 }` | `ThreadSummary` |
| SF-03 | `getThread` | `{ threadId: int }` | `{ thread, messages[] }` (delegates to SPEC-02 for message read) |
| SF-05 | `deleteThread` | `{ threadId }` | `{ ok }` — **soft delete** (`is_deleted = true`) |

UI surfaces:
- **Sidebar** — list, create button, selected highlight, empty state.
- **Create dialog** — two fields (recruiter name, company), inline validation, cancel/submit.
- **Thread header** — recruiter name + company, delete action (no archive, no status).

## Behavior (acceptance criteria)
- AC-1 (FR-01): Sidebar renders every non-deleted chat showing recruiter name and company.
- AC-2 (FR-01): With zero chats, sidebar shows a "no chats yet" empty state + create affordance.
- AC-3 (FR-02): "+" opens the create dialog with recruiter name and company fields.
- AC-4 (FR-02): Submitting with an empty name or company shows inline validation and does not create.
- AC-5 (FR-02): Valid submit persists the chat, adds it to the sidebar, and makes it active.
- AC-6 (FR-02): Cancel/close leaves no chat created.
- AC-7 (FR-03): Selecting a chat loads and displays its messages oldest→newest.
- AC-8 (FR-03): Switching chats fully replaces the displayed history.
- AC-9 (FR-16): The active chat is reflected in the URL; reloading that URL restores it.
- AC-10 (FR-04 / Q4): **Delete** requires confirmation and **soft-deletes** the chat (`is_deleted`);
  it disappears from the sidebar; its data is retained. No archive and no status exist.
- AC-11 (FR-15): Layout is the single-pane sidebar + chat shell; **desktop-first only** (Q31); dark
  theme (zinc, Q32); English only (Q33); no keyboard shortcuts (Q34); unsent composer text is not
  preserved across navigation (Q35).
- AC-12 (Q2/Q3): Each chat is a single linear thread; no status field; no sub-threads.

## Edge cases & error handling
- Duplicate (recruiter, company): allowed (Q2) — both appear; distinguished by last activity.
- Very long names/companies: ellipsis in sidebar, full text on hover/header.
- `getThread` with unknown id: typed `not_found` result; UI shows a "chat not found" state.
- `getThread` on a soft-deleted chat: `not_found` (deleted chats are not retrievable via UI).
- Soft-delete of a chat with an in-flight generation: block or cancel generation first.

## AI / privacy constraints affected
- None directly (no model call here). Privacy: all data stays local by default; web server binds to
  loopback by default (NFR-02.1); model calls only to `OPENAI_BASE_URL`.
- No network calls except local server functions + the configured model endpoint.

## Test obligations (doc 09)
- **Unit (domain):** `Thread.create` enforces `I1`; no status property exists (I7);
  `softDelete` sets the flag; `ThreadSummary` mapping excludes deleted.
- **Integration (server fn + temp SQLite) (post-MVP, Q38):** `createThread`→`listChats` appears; `getThread` ordering;
  `deleteThread` soft-deletes (chat no longer listed, data retained); unknown/deleted id → `not_found`.
- **Guardrail (D3, unit):** prompt-safety + no telemetry / no unexpected endpoints.

## Changelog
- v1 (2026): initial draft.
- v2 (2026): endpoint generalized; privacy reworded.
- v3 (2026): removed status/archive; one linear thread per chat; soft-delete only (Q3/Q4 confirmed).
- v4 (2026): Q7 (no search; sort by last activity, then name) and Q31 (desktop-first) confirmed;
  UX decisions Q32–Q35 recorded in AC-11; integration test obligations deferred post-MVP (Q38).
