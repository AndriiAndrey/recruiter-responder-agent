# 10 — Open Questions & Decisions

**Status:** Living document — every open item and decision is tracked here.
**How to use:** work through the questions, fill in **Your answer**, and flip **Status**. Items
marked 🏛 **block spec approval** (they change the schema or architecture). The confirmed set below
unblocks the first build slice; the rest proceed on the stated *proposal* and can be locked later.

Legend — **Status:** `Open` (needs you) · `Proposed` (default set, confirm to lock) · `Confirmed`.
**Impact:** 🏛 = blocks schema/architecture · ⚙ = setup/config · 🎨 = UX · 🧪 = testing · 📝 = process.

> **2026 update (round 1):** the 🏛 set is fully answered, including the follow-ups (Q5a/Q5b) and the
> thread lifecycle (Q3/Q4) + size cap (Q21). All six decisions (D1–D6) plus **D7** are `Confirmed`.
> **Slice 0 is fully unblocked** — the only items left are non-blocking `Proposed` defaults.
>
> **2026 update (round 2):** the remaining 24 non-blocking `Proposed` items are now all
> `Confirmed` (Q7, Q8, Q12, Q15, Q16, Q26–Q36, Q38–Q45). Overrides vs. the proposals:
> **Q27** code must be **platform-agnostic** (develop/test on macOS only for now), **Q37/Q38** the
> MVP is **unit tests only** (integration + E2E deferred), **Q43** the model-status indicator is a
> **must-have**, **Q34** keyboard shortcuts are out of v1.
> **No open questions remain** — every Q and decision D1–D7 is `Confirmed`.

---

## A. Scope & domain

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q1** | Strictly **single-user, no auth/multi-tenancy**? | Yes — one user, no login | 🏛 | **Confirmed** | single-user |
| **Q2** | **Thread identity:** one thread per (recruiter, company), or multiple? | Each thread = **one chat**, created manually; **no uniqueness constraint** (multiple chats per pair allowed); the pair is the tab title | 🏛 | **Confirmed** | one thread per chat, name+company as tab title |
| **Q3** | Thread **status** (active/archived/pipeline)? | **No status at all** — not needed | 🏛 | **Confirmed** | no thread status needed |
| **Q4** | Thread **lifecycle**: archive? delete? | **Soft-delete only** — no archive, no hard delete; one main thread per chat | 🏛 | **Confirmed** | only deletable, soft delete |
| **Q5** | Messages **immutable** or **editable/deletable**? | **Editable and deletable** (Model B) | 🏛 | **Confirmed** | editable + deletable |
| **Q5a** | **Edit scope:** all roles, or only the user's own? | **All roles** | 🏛 | **Confirmed** | all roles |
| **Q5b** | **Delete: soft or hard?** | **Soft delete** (`is_deleted`) | 🏛 | **Confirmed** | soft delete |
| **Q6** | **Roles:** single `user`, or split note/reply? Are notes in the AI context? | **Three roles**: `recruiter` (opponent), `user_reply`, `user_note`; **all three** in the AI context | 🏛 | **Confirmed** | split note + reply; opponent + my replies; all in context |
| **Q7** | **Search / filter / sort** across threads? | No full-text search in v1; sidebar sorted by last activity, then name | ⚙/🎨 | **Confirmed** | no search; sort by last activity, then name |
| **Q8** | **Import / export / backup**? | No in v1 (the SQLite file is the backup) | 📝 | **Confirmed** | no |

## B. AI integration (any OpenAI-compatible endpoint)

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q9** | **Model identifier** + default? | Configured via `OPENAI_MODEL_NAME` (no hardcoded model) | 🏛 | **Confirmed** | `OPENAI_MODEL_NAME` env var |
| **Q10** | **Env var names + endpoint config**? | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_NAME` | 🏛 | **Confirmed** | those three env vars |
| **Q11** | **Streaming** draft vs single response? | **Streaming** (`streamText`) | 🏛 | **Confirmed** | yes |
| **Q12** | **Generation params** (temp/top_p/max_tokens) + defaults? | `temperature 0.2`, `top_p 1`, `max_tokens 1024` (configurable via env) | ⚙ | **Confirmed** | temp 0.2, top_p 1, max_tokens 1024 (configurable) |
| **Q13** | **Context-overflow** strategy? | Keep **full CV** + most-recent messages, drop oldest first with an "omitted" marker; fail if CV alone too big | 🏛 | **Confirmed** | yes |
| **Q14** | **Output shape:** combined vs structured? | **Combined single draft** | 🏛 | **Confirmed** | combined |
| **Q15** | Confirm **failure UX + error set**? | Typed errors (doc 06 §7); inline message + retry button | 🎨 | **Confirmed** | yes |
| **Q16** | Persist **generation provenance** (`generation_log`)? | No in v1 (optional table later) | 📝 | **Confirmed** | no |
| **Q17** | **Abandoned drafts** kept or **ephemeral**? | **Ephemeral** (memory-only) | 🏛 | **Confirmed** | yes (ephemeral) |
| **Q22** | **`context.md` missing/empty:** block or warn? | **Block** generation with a clear "add your CV" message | 🏛 | **Confirmed** | yes (block) |

## C. Data & schema

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q18** | DB file: which / how configured? | **Configured via `DATABASE_URL`** in `.env` (not hardcoded); keep `.env` + `.env.local` consistent | 🏛 | **Confirmed** | `DATABASE_URL` env var |
| **Q19** | **ID strategy:** int vs ULID/UUID? | **Integer autoincrement** | 🏛 | **Confirmed** | int |
| **Q20** | **Timestamps: format + timezone?** | **Milliseconds, UTC** | 🏛 | **Confirmed** | ms in UTC |
| **Q21** | **Message body size cap** + final field set? | **32 KB** per message (zod); fields per doc 04 §2 | 🏛 | **Confirmed** | 32 KB |

## D. Privacy & security

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q23** | Model endpoint **loopback-only**, or configurable? | **Configurable** — `OPENAI_BASE_URL` local by default, **remote allowed as a documented opt-in** (may host in the future). Web server still binds to loopback by default. | 🏛 | **Confirmed** | not localhost-only; may host remotely later |
| **Q24** | **Automated guardrail**: what does it enforce? | **Prompt-safety** (input treated as *data*, not *commands*) + **no telemetry** + **no unconfigured external endpoints**. Does *not* block non-localhost model calls. | 🏛 | **Confirmed** | guardrail = don't treat input data as a command, only as data |
| **Q25** | Remove the leftover empty **`ANTHROPIC_API_KEY`**? | **Yes, remove** | ⚙ | **Confirmed** | yes |
| **Q26** | **Encryption at rest** for the SQLite file? | **No** (local file, single user) | ⚙ | **Confirmed** | no |
| **Q42** | **Log-redaction:** no CV/message bodies in logs by default? | **Yes** — log lengths/hashes, not bodies | ⚙ | **Confirmed** | yes |

## E. Platform & setup

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q27** | **Platform** scope + CI? | Code is **platform-agnostic**; develop/test on macOS/Apple Silicon only for now; no multi-platform CI for now | ⚙ | **Confirmed** | platform-agnostic code; test on Mac only for now |
| **Q28** | **Minimum Node** version + `engines`/`.nvmrc`? | **>= 22**, add both | ⚙ | **Confirmed** | >= 22 |
| **Q29** | **How is the model run / configured?** | **Any OpenAI-compatible endpoint**, configured via `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME` (local by default; remote opt-in) | 🏛 | **Confirmed** | run any OpenAI-compatible model, configured via env |
| **Q30** | Must the **production build** path work locally? | Both `dev` + `build` work; `build` is in "done" | ⚙ | **Confirmed** | yes |
| **Q43** | Live **"model connected?"** indicator? | **Must-have** (SF-08 `getModelStatus`; indicator in the UI) | 🎨 | **Confirmed** | must-have |
| **Q44** | **Prune unused scaffold AI packages** (`ai-anthropic/gemini/ollama`)? | Yes, prune; keep `ai-openai` only | ⚙ | **Confirmed** | yes, keep ai-openai only |

## F. UX & UI

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q31** | **Desktop-first only**, or responsive/mobile? | Desktop-first only (single pane) | 🎨 | **Confirmed** | desktop-first only |
| **Q32** | **Theme:** dark, light, or toggle? | Dark default (base color zinc) | 🎨 | **Confirmed** | dark default (zinc) |
| **Q33** | **Language:** English only? | English only | 🎨 | **Confirmed** | yes |
| **Q34** | **Keyboard shortcuts** (e.g., Cmd+Enter to commit)? | **No — out of v1** (may be revisited later) | 🎨 | **Confirmed** | no |
| **Q35** | **Preserve unsent composer text** across navigation? | No (clear on navigate) | 🎨 | **Confirmed** | no |

## G. Testing

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q36** | **Coverage targets**? | `domain/` ≥ 90%, `server/` ≥ 80% (floors) | 🧪 | **Confirmed** | domain/ ≥ 90%, server/ ≥ 80% |
| **Q37** | **E2E (Playwright)** needed for v1? | **No for MVP** — unit tests only; E2E deferred | 🧪 | **Confirmed** | no, unit tests only for MVP |
| **Q38** | **Mock OpenAI-compatible server** integration test? | **No for MVP** — unit tests only (fake model); integration deferred post-MVP | 🧪 | **Confirmed** | no integration tests for MVP, only unit |

## H. Workflow & process

| ID | Question | Decision / proposal | Impact | Status | Your answer |
|----|----------|--------------------|--------|--------|-------------|
| **Q39** | **Solo developer**? Confirm **out-of-scope list** (doc 01 §7)? | Yes, solo; out-of-scope as listed | 📝 | **Confirmed** | yes, as listed |
| **Q40** | **Branching/commit conventions**? | Trunk-based, short branches, Conventional Commits, reference spec IDs | 📝 | **Confirmed** | trunk-based, short branches, Conventional Commits, reference spec IDs |
| **Q41** | **Spec change management**: per-spec revision + changelog? | Yes — bump revision + changelog line, update PRD in same change | 📝 | **Confirmed** | yes |
| **Q45** | Single **`npm run ci`** convenience script? | Yes — `npm run ci` runs check + test + build; CI provider deferred (Q27: no multi-platform CI for now) | 📝 | **Confirmed** | yes |

---

## Decision log (Architecture Decision Records)

All are now **Confirmed** (D1–D9). Reversing a decision requires a new ADR entry
(append, don't delete).

| ID | Decision | Rationale | Linked Q | Status |
|----|----------|-----------|----------|--------|
| **D1** | Messages are **editable and soft-deletable** (Model B). Edit sets `updatedAt`; delete sets `is_deleted`; position is fixed by `createdAt`. | User requires editable/deletable messages; soft delete reconciles with the PRD's permanent-log intent. | Q5, Q5a, Q5b | **Confirmed** |
| **D2** | **No separate `recruiters` table** — threads carry `recruiter_name` + `company` directly; no uniqueness constraint. | Minimal schema; each thread is one chat; grouping is a display concern. | Q2 | **Confirmed** |
| **D3** | **Guardrail = prompt-safety + no-telemetry + no unconfigured endpoints.** `PromptAssembler` wraps input as *data*; the system prompt treats it as data, not commands. Does **not** block non-localhost model calls. | A remote endpoint is an allowed opt-in (Q23); the real risk is prompt injection + accidental telemetry. | Q24, Q23 | **Confirmed** |
| **D4** | **DB file is set by `DATABASE_URL`** in `.env` (not hardcoded); keep `.env` + `.env.local` consistent. | User wants the filename configurable via env; removes scaffold drift. | Q18 | **Confirmed** |
| **D5** | **Web server binds to loopback by default** (configurable); the **model endpoint** (`OPENAI_BASE_URL`) is configurable (local default, remote opt-in). | Single-user app stays private by default; the model can be hosted remotely later. | Q23 | **Confirmed** |
| **D6** | **Streaming** generation into the editable field. | Fast first-token feedback, progress, abort; best UX for model latency. | Q11 | **Confirmed** |
| **D7** | Each chat is **one main, linear Thread**; **no status, no archive**; Threads are **soft-deletable only** (no sub-threads, no hard delete). | User: no status needed; one main thread per chat; a chat is only soft-deletable. | Q3, Q4 | **Confirmed** |
| **D8** | **AgentCI conventions for spec-less and retro slices:** setup slices (no spec file) use the doc 08 §3 slice row + its cited docs as the spec stand-in, with derived ACs (`AC-<slice>-##`, marked *derived*); retro runs audit shipped code (as-built architect mode → remediation plan R## executed by the coder); invariants owned by later slices are `deferred → <slice>` in the test map; discovered pipeline gaps (P##) are fixed in the agent files by the orchestrator. | The slice-0 rehearsal exposed contract gaps P1–P7 (see `agentci/runs/10.11.26_foundations.md`); codifying them makes setup/audit runs first-class instead of ad-hoc. | — (process, 📝) | **Confirmed** |
| **D9** | **One shared brief per slice (single source of truth):** all seven stages work inside `agentci/runs/<DD.MM.YY>_<work-title>.md` (directly in `runs/`, no subfolders) — the date prefix is the day the brief is created (chronological history), and the file is named after the work to be done (short, readable, kebab-case; created by the scout from `agentci/template/brief.md`). Stage sections are **append-only** work summaries; the **analyst section is the user review gate** — findings with proposed solutions (pros/cons) + questions, and the pipeline stops until every question is answered; every stage from architect onward opens with **decision compliance**; a rolling §8 **open-items ledger** tracks questions/findings/risks/decision changes raised by any stage. Decisions are kept as **current state**: when a decision changes, a new ledger entry records who/when/why and the original row is edited in place (no trail of old states). | The pipeline previously committed six separate artifacts per slice — decisions were scattered, open items had no single home, and later stages could drift from earlier decisions without a visible contract. One file = one place to read the decisions, add the summary, and iterate on items needing investigation or clarification. | — (process, 📝) | **Confirmed** |

> **Process:** to confirm a `Proposed` item, set its `Status` to `Confirmed` and (for a decision)
> set the decision `Status` to `Confirmed`. The specs that depend on it can then move to **Approved**
> (doc 08 §2).

---

## What's still open

**Nothing.** Every question (Q1–Q45, including Q5a/Q5b) is `Confirmed` and all decisions (D1–D7)
are locked (round 2, 2026). The items that were `Proposed` defaults are now part of the contract;
reversing any of them follows the change-management process (doc 08 §6): update doc 10, bump the
affected spec's revision + changelog, and keep the PRD in sync.

> **Ready to build:** with all questions confirmed, **SPEC-01…04 are `Approved`** and **slice 0**
> (replace the `todos` schema, set `.env`, create the `context.md` placeholder, DDD layout,
> `engines` + `.nvmrc` per Q28, prune unused AI packages per Q44, add `npm run ci` per Q45) can
> begin per doc 08 §3.
