# 04 — Data Model

**Status:** **Approved** (all schema questions resolved: Q2, Q3, Q4, Q5, Q5a, Q5b, Q6, Q18, Q19, Q20, Q21)
**Storage:** SQLite via Drizzle ORM + better-sqlite3. Migrations in `./drizzle`.
**Replaces:** the default `todos` table in `src/db/schema.ts`.

Confirmed decisions driving this schema:
- **Q2 — each chat is one Thread** (the tab, recruiter + company); **one linear conversation per
  Thread**; no sub-threads, no uniqueness constraint on (recruiter, company).
- **Q3 — no thread status.** No `active`/`archived`, no pipeline. (Removed.)
- **Q4 — a Thread is soft-deletable only** (no archive, no hard delete). Deleting a Thread hides it;
  its messages are reached only through a non-deleted Thread.
- **Q5 / Q5a / Q5b — messages are editable and soft-deletable**; edit scope = **all roles**; delete =
  **soft** (`is_deleted`).
- **Q6 — three sender roles**: `recruiter` (opponent), `user_reply` (my reply), `user_note` (my note).
- **Q18 — the DB file is whatever `DATABASE_URL` resolves to** (configured in `.env`).
- **Q19 — integer autoincrement IDs.** **Q20 — timestamps in milliseconds, UTC.** **Q21 — 32 KB body cap.**

---

## 1. Entity-relationship overview

```
threads (chat) 1 ──< messages
           (context.md is a file, NOT in the DB)
```

- A **Thread** is a chat channel with one recruiter (name + company), shown as a tab title.
  "Chat" and "Thread" are the **same 1:1 object** — each chat has exactly **one main, linear
  conversation** (its messages). There is **no sub-threading, no branching, no multiple threads
  per chat, and no status**.
- A **message** belongs to exactly one Thread, has a sender role, body, and timestamps.
- The CV (`data/context.md`) is **not** stored in the DB (single source of truth = the file).

> **Q2/Q3/Q4 (confirmed):** Threads are created manually (name + company as the tab title); multiple
> chats may share the same recruiter/company (no uniqueness constraint); there is no status field;
> the only lifecycle action is a **soft delete**.

---

## 2. Confirmed schema (Drizzle)

```ts
// src/db/schema.ts
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const threads = sqliteTable("threads", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),        // Q19
	recruiterName: text("recruiter_name").notNull(),
	company: text("company").notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`), // Q20: ms/UTC
	// Q4 (confirmed): the only lifecycle action — soft delete (no status, no archive)
	isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
});

export const messages = sqliteTable("messages", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),        // Q19
	threadId: integer("thread_id")
		.notNull()
		.references(() => threads.id, { onDelete: "cascade" }),                  // safety net; thread delete is soft
	// Q6 (confirmed): the three sender roles
	role: text("role", { enum: ["recruiter", "user_reply", "user_note"] }).notNull(),
	body: text("body").notNull(),                                               // Q21 (confirmed): 32 KB cap enforced by zod
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`), // Q20: ms/UTC
	// Q5/Q5a/Q5b (confirmed): editable + soft-deletable, all roles
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }),                 // set on edit (nullable)
	isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false), // soft delete
});

export const messagesByThreadCreated = sqliteIndex("messages_thread_created_idx")
	.on(messages.threadId, messages.createdAt);
```

### Field rationale

| Table.Column | Why | Source |
|--------------|-----|--------|
| `threads.id` | PK; stable ref for messages + routing | Q19 |
| `threads.recruiter_name` | Tab title / grouping key (PRD) | — |
| `threads.company` | Tab title / grouping key (PRD) | — |
| `threads.created_at` | Creation time (ms, UTC) | Q20 |
| `threads.is_deleted` | Soft-delete flag — the only Thread lifecycle action (no status/archive) | Q3, Q4 |
| `messages.id` | PK (also the ordering tie-break) | Q19 |
| `messages.thread_id` | Ownership (FK) | — |
| `messages.role` | `recruiter \| user_reply \| user_note` | Q6 |
| `messages.body` | The text (paste / reply / note / committed draft); ≤ 32 KB | Q21 |
| `messages.created_at` | Chronological position (ms, UTC) | Q20 |
| `messages.updated_at` | Set when the body is edited (ms, UTC) | Q5 |
| `messages.is_deleted` | Message-level soft-delete flag (see §4) | Q5, Q5b |

---

## 3. Ordering & timestamps

- **Order:** messages are read `ORDER BY created_at ASC, id ASC` (oldest → newest; ties by id).
- **Timestamps:** **milliseconds since epoch, UTC** (`timestamp_ms`). Stored as epoch millis
  (timezone-independent); **displayed in UTC** (Q20).
- **Edited messages** keep their original `created_at` (position unchanged); `updated_at` records
  the edit time. New messages get a fresh `created_at`.

---

## 4. Editability model (Model B — confirmed)

Messages are **editable and soft-deletable** (Q5/Q5a/Q5b confirmed):

- **Edit (Q5a = all roles):** any message's `body` can be edited regardless of role; the edit sets
  `updatedAt`. Editing does **not** change position (`createdAt` is untouched).
- **Delete (Q5b = soft):** setting `is_deleted = true` excludes the message from the view **and**
  the AI context. The row stays (audit/recovery), reconciling "deletable" with the PRD's permanent-log intent.
- An **edited** message contributes its current `body` to the AI context; a **deleted** message
  contributes nothing.

**Thread delete (Q4 = soft, no archive):** setting `threads.is_deleted = true` hides the chat from
the sidebar and all Thread listings. Messages are only ever reached through a non-deleted Thread,
so the subtree is hidden without cascading flags. There is no archive and no hard delete.

---

## 5. Data lifecycle

| Event | Operation | Constraint |
|-------|-----------|------------|
| Create Thread | `INSERT threads` | non-empty name+company (zod) |
| Add message | `INSERT messages` (single txn) | non-empty body, ≤ 32 KB, valid role |
| Edit message | `UPDATE messages SET body, updated_at` | non-empty body, ≤ 32 KB |
| Soft-delete message | `UPDATE messages SET is_deleted = true` | — |
| Soft-delete Thread | `UPDATE threads SET is_deleted = true` | confirmation in UI; no cascade flag needed |
| CV change | edit `data/context.md` on disk | not in DB; read fresh per generation |

---

## 6. Migrations & the `todos` table

- The default `todos` table is **replaced** by `threads` + `messages`.
- Plan: update `src/db/schema.ts`, run `npm run db:generate` → migration in `./drizzle`, then
  `npm run db:migrate` (dev: `db:push` while the schema is still fluid).
- **No `.db` file exists yet**, so the first migration is generated cleanly from this schema.
- The DB **file** is whatever `DATABASE_URL` resolves to (Q18 / D4). Set it in `.env`; keep
  `.env` and `.env.local` consistent (see doc 07 §3).

> **Confirmed (Q18):** the DB filename is not hardcoded — it comes from `DATABASE_URL` in `.env`.

---

## 7. What is intentionally NOT in the DB

- The CV (`context.md`) — the file is the single source of truth (FR-13).
- AI drafts before commit — ephemeral UI state (FR-11, Q17 confirmed ephemeral).
- Prompts / model outputs for audit — `generation_log` **not in v1** (Q16 confirmed; optional later).
- **No status/archive** on Threads (Q3) — deliberately absent.

## 8. Residual questions

**None.** All slice-0 schema questions (Q2–Q6, Q18–Q21) are confirmed. This schema is final for
slice 0.
