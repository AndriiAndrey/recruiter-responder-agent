# SPEC-02 — Bi-directional Message Logging (editable, deletable)

**Status:** **Approved** (Q5/Q5a/Q5b/Q6/Q20/Q21 confirmed)
**Requirements:** FR-05…07
**Blocking questions (resolved):** Q5 (editable/deletable), Q5a (edit all roles), Q5b (soft delete),
Q6 (three roles), Q20 (ms/UTC), Q21 (32 KB cap) — all confirmed.
**Depends on:** SPEC-01 (thread exists + is selected)

## Goal
Let the user append messages to the active thread — clearly marking each as a **recruiter** message,
a **user reply**, or a **user note** — with permanent, chronological storage where messages can be
**edited or deleted**.

## User stories
- As a user, I can toggle whether the text I'm adding is from the recruiter, my reply, or a private note.
- As a user, every message I log is stored permanently and in order, building a complete record.
- As a user, I can correct (edit) or remove (delete) a message I got wrong.
- As a user, I can read the conversation with clear sender attribution and UTC timestamps.

## Scope
### In
- Composer with an explicit **sender toggle** with three options: `recruiter` | `user_reply` |
  `user_note` (Q6). A default is set (proposal: `recruiter`, since pasting from LinkedIn is the
  most common first action).
- Commit action → appends one `Message` (single transaction) via SF-04.
- **Edit** a message's body (SF-09) → sets `updatedAt`; position unchanged.
- **Delete** a message (SF-10) → soft delete (`is_deleted`); excluded from view + AI context.
- Validation: non-empty body, length cap (NFR-10.2 / Q21), valid role.
- Chronological rendering with sender + UTC timestamp (FR-07).

### Out (explicit)
- Hard physical delete in v1 (soft delete per Q5b; hard is the alternative).
- Media/attachments, rich-text formatting, LinkedIn-style threading/replies.
- Reordering messages (position is fixed by `createdAt`).

## Data
- Table: `messages` (doc 04 §2). Invariants: `I2` chronological order (ties by `id`), `I3` valid role
  + non-empty body within cap, `I4` editable + soft-deletable, `I6` only non-deleted shown/used.
- `role` enum: `recruiter | user_reply | user_note` (Q6). **All three** are in the AI context.
- `createdAt`/`updatedAt`: milliseconds, UTC (Q20). Ordering read: `ORDER BY created_at ASC, id ASC`
  filtered by `is_deleted = false`.

## Interfaces
| SF | Name | Input (zod) | Output |
|----|------|-------------|--------|
| SF-04 | `addMessage` | `{ threadId: int, role: enum, body: non-empty, len ≤ cap }` | stored `Message` |
| SF-09 | `editMessage` | `{ messageId: int, body: non-empty, len ≤ cap }` | updated `Message` |
| SF-10 | `deleteMessage` | `{ messageId: int }` | `{ ok }` (soft) |
| (read) | part of SF-03 `getThread` | — | active `Message[]` ordered |

UI surfaces:
- **Composer** — textarea, sender toggle (3-way segmented control, default per Q6), commit button.
- **Message list** — rows with sender label (recruiter / you (reply) / you (note)), UTC timestamp,
  distinct styling per role, and edit/delete affordances.
- Empty-thread state: "No messages yet — paste the first one."

## Behavior (acceptance criteria)
- AC-1 (FR-05): Composer shows an explicit 3-way toggle (recruiter / user_reply / user_note); a default is set.
- AC-2 (FR-05): The selected sender is applied to the committed message and rendered distinctly.
- AC-3 (FR-05): Toggle state persists while the user is typing.
- AC-4 (FR-06): Committing appends exactly one `Message` with thread ref, role, body, created-at (ms/UTC).
- AC-5 (FR-06): Empty/whitespace-only bodies are rejected with inline feedback; nothing stored.
- AC-6 (FR-06): After commit, the composer clears and the message appears in the list.
- AC-7 (FR-06): Bodies longer than the cap (Q21) are rejected with feedback.
- AC-8 (FR-06 / I2): N committed messages are returned and displayed strictly oldest→newest (ties by id).
- AC-9 (Q5/Q5a / I4): A message's body can be **edited — for any role** (Q5a = all roles); `updatedAt`
  is set; its position (`createdAt`) is unchanged.
- AC-10 (Q5/Q5b / I4/I6): A message can be **deleted (soft, Q5b)**; it disappears from the view
  **and** the AI context; the row is retained.
- AC-11 (Q6): All three roles (`recruiter`, `user_reply`, `user_note`) are stored and appear in the
  AI context (full history).
- AC-12 (FR-07): Each message shows sender and a UTC timestamp (ms/UTC, Q20).
- AC-13 (FR-07): Roles are visually distinguishable; multiline bodies wrap, whitespace preserved.

> **Q5a (confirmed):** edit scope is **all roles** — any message body (recruiter, reply, or note) can
> be edited. **Q5b (confirmed):** delete is **soft** (`is_deleted`). **Q21 (confirmed):** body cap
> is **32 KB**.

## Edge cases & error handling
- Rapid double-commit: guarded (disable commit while in flight) to avoid duplicates (NFR-04.4).
- Edit/delete of an already-deleted message: no-op / typed error.
- Edit to empty/over-cap body: rejected with feedback (same rules as add).
- Commit to a deleted-mid-action thread: typed error, message not stored.
- Paste with trailing newlines/extra spaces: stored as-is (it's the user's text); only fully-empty is rejected.

## AI / privacy constraints affected
- **PRD-6 (sequential logging, editable):** transactional, ordered; messages editable + soft-deleted.
- **PRD-2 anchor:** active (non-deleted) messages of **all three roles** become part of the thread
  context for AI (Q6).
- Privacy: messages stored locally only; model calls only to `OPENAI_BASE_URL`.

## Test obligations (doc 09)
- **Unit (domain):** `Thread.addMessage` enforces `I3`; ordering `I2` with ties by id;
  `editMessage` keeps `createdAt` (I2) + sets `updatedAt`; `deleteMessage` sets `is_deleted` (I4);
  `activeMessages()` excludes deleted (I6); role set is exactly the 3 values (Q6).
- **Unit (policy):** `MessagePolicy` length cap + whitespace rule.
- **Integration (temp SQLite) (post-MVP, Q38):** commit N → ordered; edit updates body + updated_at; delete hides
  from `getThread`; empty body rejected.
- **Guardrail (D3, unit):** prompt-safety + no telemetry / no unexpected endpoints.

## Changelog
- v1 (2026): initial draft.
- v2 (2026): Model B (editable/deletable), three roles (Q6), ms/UTC timestamps (Q20).
- v3 (2026): Q5a (edit all roles), Q5b (soft delete), Q21 (32 KB) confirmed.
- v4 (2026): integration test obligations deferred post-MVP (Q38: MVP is unit tests only).
