# 01 — Functional Requirements

**Status:** Draft
**ID scheme:** `FR-##`
**Source of truth:** [`PRD.md`](./PRD.md)

This document defines **what** the system does, expressed as functional requirements, user
stories, and acceptance criteria. Each requirement maps to one or more specs in
[`specs/`](./specs/README.md) and to test obligations in
[`09-testing-strategy.md`](./09-testing-strategy.md).

Open items that block final approval are flagged `> [!OPEN Q##]` and tracked in
[`10-open-questions-and-decisions.md`](./10-open-questions-and-decisions.md).

---

## 1. Capability map

| Area | Requirements | Spec |
|------|--------------|------|
| Thread & chat management | FR-01 … FR-04 | [SPEC-01](./specs/FR-01-thread-management.md) |
| Bi-directional message logging | FR-05 … FR-07 | [SPEC-02](./specs/FR-02-message-logging.md) |
| On-demand AI drafting | FR-08 … FR-12 | [SPEC-03](./specs/FR-03-ai-answer-generation.md) |
| CV context management | FR-13 … FR-14 | [SPEC-04](./specs/FR-04-context-management.md) |
| Workspace shell & navigation | FR-15 … FR-16 | (shell) |

---

## 2. Thread & chat management

### FR-01 — Multi-chat workspace (sidebar)
The app provides a persistent sidebar listing conversation channels. Each channel represents
one recruiter conversation and displays the recruiter's **name** and **company**. Channels
are grouped by recruiter name + company.

- **US-01:** As a user, I can see all my recruiter conversations in one place so I can track
  multiple recruitment loops concurrently.
- **AC:**
  - Sidebar renders all threads, grouped/sorted deterministically: by **last activity, then name**
    (Q7 confirmed). **No full-text search or filtering in v1** (Q7).
  - Each entry shows recruiter name and company.
  - Selecting a thread loads it in the main pane.
  - Empty state: when no threads exist, the sidebar shows a clear "no threads yet" hint and the create affordance.

### FR-02 — Manual thread creation
A dedicated **"+"** control opens a creation dialog to initialize a new thread. The dialog
collects the **recruiter name** (required) and **company** (required).

- **US-02:** As a user, I can create a new isolated conversation channel for a recruiter by
  entering their name and company.
- **AC:**
  - "+" opens a dialog with fields: recruiter name, company.
  - Both fields are required; validation errors shown inline.
  - On success, the thread is persisted, appears in the sidebar, and becomes the active thread.
  - Cancellation leaves no thread.
  - Q2 (confirmed): each thread is one chat; **no uniqueness constraint** — the same recruiter/
    company pair can have multiple chats. The pair is shown as the tab title.
  - Q3 (confirmed): threads have **no status** (no active/archived/pipeline).

### FR-03 — Thread selection & loading
Selecting a thread in the sidebar loads its full chronological message history into the main
chat pane.

- **US-03:** As a user, I can open any thread and immediately see the whole conversation in order.
- **AC:**
  - Messages render in strict chronological order (oldest → newest).
  - Loading a different thread fully replaces the displayed history.
  - The selected thread is visually highlighted.

### FR-04 — Chat deletion (soft)
A chat (thread) can be **soft-deleted**. There is **no archive** and **no status** (Q3/Q4 confirmed).

- **US:** As a user, I can remove a chat I no longer need; it disappears from the sidebar but its
  data is retained (soft delete).
- **AC (Q4 confirmed):**
  - Delete requires a confirmation step.
  - Delete **soft-deletes** the chat (`is_deleted = true`); it is hidden from the sidebar and all
    listings; its data is retained.
  - There is **no archive** and **no status** on a chat.

---

## 3. Bi-directional message logging

### FR-05 — Bi-directional input toggle (three sender roles)
The input terminal has an **explicit toggle** distinguishing the sender of each message (Q6 confirmed):
1. **Recruiter (opponent)** — text pasted from the recruiter on LinkedIn.
2. **User reply** — the user's own sent reply.
3. **User note** — the user's private note.
All three are part of the history and are provided to the AI as full context.

- **US-04:** As a user, I can clearly mark whether the text I'm adding is from the recruiter, my
  reply, or a private note, so the record and the AI context are accurate.
- **AC:**
  - A visible toggle/segmented control with exactly three options (recruiter / user reply / user
    note), defaulting to `recruiter` (proposal; the most common first action is pasting from LinkedIn).
  - The chosen sender is applied to the message on commit and is rendered distinctly in the thread.
  - The toggle state persists while typing within the session.
  - All three roles are stored and appear in the AI context (full history).

### FR-06 — Committing, editing, and deleting a message (sequential logging)
Every committed message is stored in local SQLite in chronological order. Messages are **editable
and deletable** (Q5 confirmed, Model B).

- **US-05:** As a user, every message I log is stored in order, building an accurate record, and I
  can correct or remove a message if I got it wrong.
- **AC:**
  - Committing appends exactly one row with: thread ref, sender role, body, created-at (ms/UTC).
  - Ordering is by creation time (ms, UTC); ties broken by `id` (Q20).
  - Empty/whitespace-only bodies are rejected with inline feedback.
  - After commit, the input clears and the message appears in the thread.
  - **Edit:** a message's body can be edited; `updatedAt` is set; its position is unchanged.
  - **Delete:** a message can be deleted (soft); it is then excluded from the view and the AI context.
  - Q5a (residual): edit scope — all roles vs only the user's own (proposal: all roles).

### FR-07 — Message rendering
Messages render in the chat pane with sender attribution and UTC timestamp.

- **AC:**
  - Each message shows sender (recruiter / user reply / user note) and a UTC timestamp (ms/UTC, Q20).
  - The three roles are visually distinguishable.
  - Long/multiline messages wrap and remain readable; whitespace preserved.
  - Edit/delete affordances are available on each message (FR-06).

---

## 4. On-demand AI drafting (any OpenAI-compatible endpoint)

### FR-08 — Explicit-action-only generation
AI generation is triggered **only** by an explicit **"Generate AI Answer"** button. It never
auto-runs on text entry, paste, commit, or route change.

- **US-06:** As a user, I control exactly when the AI runs, so there are no surprise generations.
- **AC:**
  - The button is the sole trigger. No generation occurs on input, paste, blur, or navigation.
  - While generating, the button is disabled / shows a progress state to prevent double-fires.
  - Cancel/abort is possible (see Q11/Q15 for streaming + error behavior).

### FR-09 — Contextual anchoring
The generated draft is restricted to exactly two inputs: the contents of `data/context.md`
(the user's CV/project history) and the exact chronological messages of the selected thread.
The system prompt forbids inventing skills, metrics, or facts not present in those inputs.

- **US-07:** As a user, the AI only says things grounded in my CV and the actual conversation,
  so I never ship a hallucinated claim.
- **AC:**
  - The server-assembled prompt contains `context.md` + the thread's **active (non-deleted)**
    ordered messages (all three roles) + the system instruction (see
    [06-ai-integration.md](./06-ai-integration.md)).
  - The system prompt explicitly forbids fabricating skills, metrics, companies, or facts.
  - No other data source (DB settings, other threads, external knowledge) is fed to the model.
  - Q22 (confirmed): if `context.md` is missing or empty, generation is **blocked** with a clear
    "add your CV" message.

### FR-10 — Ambiguity detection
The model analyzes the recruiter's latest request for information that is missing from a
standard request (e.g., salary bounds, tech stack, remote rules, role expectations) and
**proactively drafts clarifying questions**.

- **US-08:** As a user, the AI flags what the recruiter didn't specify and suggests questions I
  can ask, so I don't have to remember what to clarify.
- **AC:**
  - When the thread contains an unanswered standard question, the draft includes clarifying
    questions for the missing items.
  - When nothing is ambiguous, the draft is a normal reply (no forced questions).
  - Q14 (confirmed): output is a **single combined draft** (reply + clarifying questions in one
    editable text).

### FR-11 — Staged text review
Generated drafts land in an **editable** text field. They are committed to the database **only**
after the user reviews/edits and explicitly commits.

- **US-09:** As a user, I always read and can edit the draft before it becomes part of the record.
- **AC:**
  - Draft renders in an editable, clearly-labeled field (not auto-committed).
  - "Commit" persists the (possibly edited) text as a user message via the normal logging path
    (FR-06), using the user sender role.
  - "Discard" (or regenerating) discards the draft without persisting.
  - Q17 (confirmed): a draft that is never committed is **not** stored (ephemeral, memory-only).

### FR-12 — Generation status & errors
The UI reflects generation progress and failure clearly.

- **AC (Q15 confirmed):**
  - Progress indicator while generating (streaming per Q11).
  - On failure (endpoint down, timeout, malformed response), a **redacted typed error** is shown
    **inline with a retry button**; the thread is left intact. The error set is doc 06 §7.
  - Q43 (confirmed, **must-have**): a live **"model connected?" indicator** shows whether the
    configured endpoint (`OPENAI_BASE_URL`) is reachable (SF-08 `getModelStatus`, doc 06 §7.1).

---

## 5. CV context management

### FR-13 — Single CV source of truth (`data/context.md`)
The user's CV and project history live in exactly one file: `data/context.md`. It is the only
CV input the model receives.

- **US-10:** As a user, I maintain my CV in one place and the AI uses only that, so my
  representation is consistent and deterministic.
- **AC:**
  - `data/context.md` is read fresh on each generation (no stale cache).
  - The file is a gitignored-but-local, user-authored markdown file; the repo ships a clearly
    marked **placeholder** the user fills in (never fabricated CV content).
  - Only this file's content is used for CV context (no second CV source).

### FR-14 — Context preview / existence check
The app surfaces the state of the CV context so the user knows generation is grounded.

- **AC (Q22 confirmed):**
  - A UI indicator shows whether `context.md` exists / is non-empty.
  - Optional: a settings/preview area to open `context.md` (read-only) for reference.
  - Missing/empty file blocks generation with a clear, actionable message (FR-09).

---

## 6. Workspace shell & navigation

### FR-15 — App shell layout
A single-pane desktop layout: left sidebar (threads) + main chat pane + input/draft area.

- **AC (Q31–Q34 confirmed):**
  - Layout matches the minimalist, single-pane UX goal in the PRD.
  - **Desktop-first only** (single pane); no responsive/mobile requirement (Q31).
  - **Dark theme by default** (base color zinc) (Q32).
  - **English only** (Q33).
  - **No keyboard shortcuts in v1** (Q34).

### FR-16 — Routing & state
Routes and client state are managed by TanStack Router; thread selection is URL-driven where
practical.

- **AC:**
  - Selecting a thread updates the URL (shareable/refresh-safe).
  - Refreshing on a thread route restores the same thread.
  - Q35 (confirmed): unsent composer text is **not** preserved across navigation (cleared).

---

## 7. Out of scope (v1) — confirmed (Q39)

The following are **out of scope** unless reopened per the change-management process (doc 08 §6):

- LinkedIn integration / scraping / OAuth / message sync (PRD explicitly avoids scrapers).
- Multi-user accounts, authentication, authorization, or data sharing.
- Cloud storage, telemetry, analytics, or any remote AI/API calls.
- Mobile/native apps, PWA install, or offline-desktop packaging (Tauri/Electron) unless requested.
- Notifications, reminders, or calendar integration.
- Data import/export/backup (CSV/JSON/Markdown) — the SQLite file is the backup (Q8 confirmed).
- i18n beyond English (Q33 confirmed).
- Real-time collaboration or concurrent editing.
- Full-text search / filtering across threads (Q7 confirmed: sort by last activity, then name).
- Keyboard shortcuts (Q34 confirmed: out of v1).
