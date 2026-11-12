# Documentation & Specification Index

This folder contains the **specification set** for the *Local AI Recruiter Responder Agent*.
It is the single source of truth for **what** we build and **why**, and it drives all
implementation work. The product intent lives in [`PRD.md`](./PRD.md); this set turns that
intent into testable, implementable specifications.

## Methodology

We combine two approaches:

1. **Spec-Driven Development (SDD)** — every feature is captured as a *spec* (goal, user
   stories, acceptance criteria, data, edge cases, test obligations) **before** code is
   written. Code is only "done" when its spec's acceptance criteria are met and covered by
   tests. Specs live in [`specs/`](./specs/README.md).
2. **Domain-Driven Design (DDD)** — we model the problem domain explicitly (bounded
   contexts, ubiquitous language, aggregates, entities, value objects, domain services and
   events) so the codebase structure mirrors the business. See
   [`05-domain-model-ddd.md`](./05-domain-model-ddd.md).

## How this set is organized

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Functional Requirements](./01-functional-requirements.md) | What the software must do — features, user stories, acceptance criteria. |
| 02 | [Non-Functional Requirements](./02-non-functional-requirements.md) | Quality attributes — privacy, performance, security, portability, maintainability. |
| 03 | [Architecture](./03-architecture.md) | System structure, components, data flow, server-function boundaries, integration points. |
| 04 | [Data Model](./04-data-model.md) | SQLite/Drizzle schema, tables, relationships, migrations, data lifecycle. |
| 05 | [Domain Model (DDD)](./05-domain-model-ddd.md) | Bounded contexts, ubiquitous language, aggregates, entities, value objects, services, events. |
| 06 | [AI Integration](./06-ai-integration.md) | Any OpenAI-compatible endpoint wiring (`OPENAI_*`), prompt design, context anchoring, prompt-safety, output & error handling. |
| 07 | [Development Setup](./07-development-setup.md) | Toolchain, environment, commands, env vars, model backend runtime, project layout conventions. |
| 08 | [Workflow](./08-workflow.md) | The SDD development process: spec → implement → verify, branching, review, definition of done. |
| 09 | [Testing Strategy](./09-testing-strategy.md) | Test pyramid, unit/integration/E2E policy, how AI is tested without a real model, coverage. |
| 10 | [Open Questions & Decisions](./10-open-questions-and-decisions.md) | Everything still needing confirmation, plus a decision log (ADRs). |
| — | [specs/](./specs/README.md) | Per-feature implementation specs (the heart of SDD). |

## Conventions used across all docs

- **Open questions** are flagged inline and always trace back to the master list in doc 10:
  `> [!OPEN Q##]` — a point that **needs your confirmation** before it is treated as fact.
- **Decisions / assumptions** are flagged:
  `> [!DECISION D##]` — a choice we are proposing (status *proposed* until confirmed) or have
  confirmed, with rationale.
- Every spec and requirement carries a stable ID (`FR-##`, `NFR-##`, `SPEC-##`, `Q##`, `D##`)
  so it can be referenced in code, tests, commits, and PRs.
- **Statuses**: `Draft` → `In Review` → `Approved` → `Implemented`. A spec is `Approved` only
  when its open questions are resolved and its acceptance criteria are agreed.

## Ground rules (from the PRD — non-negotiable)

1. **Local-by-default, no telemetry.** All data (chat, CV, prompts, drafts) stays on the machine
   by default; the only outbound data flow is to the user-configured model endpoint
   (`OPENAI_BASE_URL` — local by default, remote is a documented opt-in). No telemetry/analytics.
2. **Single source of truth for the CV.** Drafts are anchored to exactly two inputs:
   `data/context.md` and the selected thread's exact chronological messages.
3. **AI is explicit-action only.** Generation happens only on an explicit "Generate AI Answer" click.
4. **Staged review.** Drafts are editable and committed only after the user reviews and commits.
5. **Ambiguity detection.** The model proactively drafts clarifying questions for missing info.
6. **Sequential logging (editable).** Every committed message is stored in local SQLite in
   chronological order; messages can be edited or deleted by the user.
7. **Prompt safety.** Recruiter/CV text is treated as *data*, not *commands* (prompt-injection defense).

## Current state of the repo (baseline this set is written against)

> **Updated with slice 0 (2026-11-10):** the pre-slice-0 baseline below is kept for history.
> Current state: slice 0 delivered — `threads`/`messages` schema + first migration (`drizzle/`),
> consistent `.env`/`.env.local` (`DATABASE_URL="dev.db"`, `ANTHROPIC_API_KEY` removed),
> DDD domain + 40 unit tests in `src/domain/thread/`, `data/context.md` placeholder. Verified by
> the AgentCI run [`agentci/runs/10.11.26_foundations.md`](../agentci/runs/10.11.26_foundations.md) (review `APPROVED`).

- TanStack Start scaffold runs; `src/routes/index.tsx` is still the demo page — no real UI yet.
- `src/db/schema.ts` still holds the default `todos` table (to be replaced).
- No `data/context.md`, no `src/components`, no `drizzle/` migrations.
- `.env` (`DATABASE_URL=sqlite.db`) and `.env.local` (`DATABASE_URL="dev.db"`) disagree — see Q18.
- A leftover empty `ANTHROPIC_API_KEY` sits in `.env.local` (see Q25).
- Toolchain: Node >= 22 (Q28), npm. Develop/test on macOS, Apple Silicon (M3 Max); code is
  platform-agnostic (Q27).

> **Status:** all open questions are resolved — every Q in
> [`10-open-questions-and-decisions.md`](./10-open-questions-and-decisions.md) is `Confirmed`
> (including the non-blocking round: platform-agnostic code, MVP = unit tests only, model-status
> indicator as must-have). **SPEC-01…04 are `Approved`**; build order per doc 08 §3 —
> **slice 0 is Implemented**, slice 1 (SPEC-01) is next.
