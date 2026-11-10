# AGENTS.md

Project instructions for AI coding agents working in this repo.

## Project

**Local AI Recruiter Responder Agent** — a privacy-first, fully local web app for software engineers to track technical recruiters on LinkedIn, analyze conversations, and draft contextual replies. The full requirements live in [`docs/PRD.md`](docs/PRD.md) — treat it as the source of truth. When requirements change, update the PRD too.

## Non-negotiable constraints (from the PRD)

1. **Local-by-default, no telemetry.** All data (chat history, CV, prompts, drafts) stays on the user's machine by default. The AI runs through a **user-configured OpenAI-compatible endpoint** (use the `@tanstack/ai-openai` client pointed at `OPENAI_BASE_URL`), which is **local by default** (e.g., oMLX/MLX, LM Studio, llama.cpp on Apple Silicon). Pointing it at a **remote** endpoint is an explicit user opt-in via config and is then documented as sending data to that service. **Never** add telemetry, analytics, crash reporting, or any unconfigured third-party/external fetch. The guardrail is about **prompt safety** (recruiter/CV text is treated as *data*, not *commands*), not about blocking all non-localhost calls.
2. **Single source of truth for the CV.** AI drafts must be anchored to exactly two inputs: the contents of `data/context.md` (user CV + project history) and the exact chronological messages of the selected thread. The system prompt must forbid inventing skills, metrics, or facts not present in those inputs.
3. **AI is explicit-action only.** Generation happens **only** when the user clicks "Generate AI Answer". Never auto-generate on message entry, paste, or route change.
4. **Staged review.** Generated drafts land in an editable text field. They are committed to the database **only** after the user reviews/edits and explicitly commits.
5. **Ambiguity detection.** The model should spot information missing from the recruiter's standard request (salary bounds, tech stack, remote rules, role expectations) and proactively draft clarifying questions.
6. **Sequential logging.** Every committed message (recruiter messages, user notes, user replies) is stored in local SQLite in chronological order. Committed messages **can be edited or deleted by the user**.

## Core product surface

- **Multi-chat workspace**: persistent sidebar listing conversation channels, grouped by recruiter name + company.
- **Manual thread creation**: a "+" button opens a creation dialog (recruiter name, company).
- **Bi-directional input**: an input terminal with an explicit toggle distinguishing each message's sender — (a) the recruiter's pasted messages (opponent), (b) the user's own sent replies, and (c) the user's private notes. All three are part of the history and are provided to the AI as full context.
- **Local model drafting**: "Generate AI Answer" button per thread → editable draft → user commits.

## Delivery pipeline (AgentCI)

Feature slices are delivered through the **AgentCI pipeline** — seven specialised subagents, each
with its own instruction file and a small declared context (small context in → consistent output
out): **scout → analyst → architect → tester → coder → reviewer → documenter**.

- Entry point: [`agentci/README.md`](agentci/README.md) — stage gates, artifact shapes, failure
  routing, non-negotiables.
- Per-stage instructions: `agentci/agents/NN-<role>.md` (run in numeric order).
- Artifacts (committed, one folder per slice): `agentci/runs/<slice-id>/`.
- Use it for every slice in the `docs/08-workflow.md` §3 build order. The orchestrator spawns each
  stage with its own file + inputs only, verifies that stage's gate, then moves on.

## Current state (as of slice 0, verified)

- Slice 0 foundations are in and **verified by an AgentCI run** (`agentci/runs/slice-0/`, review APPROVED): `src/db/schema.ts` holds the confirmed `threads` + `messages` schema (doc 04), the first migration is generated/applied (`dev.db`), the DDD domain layer exists (`src/domain/thread/` — `Thread` aggregate, `Message`, `MessagePolicy`, `types.ts` (VO + errors), explicit named barrel; invariants I1–I7, 40 unit tests), and `data/context.md` is a clearly-marked placeholder (never fabricate CV content).
- Coverage floors (Q36) are enforceable: `npm run test:coverage` — `src/domain/**` ≥ 90 (measured 100), `src/server/**` ≥ 80 (inert until slice 1).
- TanStack Start app is scaffolded and running; `src/routes/index.tsx` is still the demo page — the real UI is not built yet.
- No model client code exists yet. Wire it through a server function so the `OPENAI_*` config stays server-side (slice 3, SPEC-03).
- `README.md` is still the TanStack template — update it once features land.
- The spec set in `docs/` is fully confirmed (all Q in doc 10, decisions D1–D8, incl. D8 AgentCI slice conventions) — treat `docs/PRD.md` + `docs/specs/` as the source of truth; build order in `docs/08-workflow.md` §3.

## Tech stack

- **Framework**: TanStack Start (file-based routing in `src/routes`, `createServerFn` for server logic, Nitro adapter). React 19, TypeScript.
- **Styling/UI**: Tailwind CSS v4, shadcn-style components (see `components.json`), `cn()` helper in `src/lib/utils.ts`, lucide icons. Add components with `npx shadcn@latest add <name>` (this repo uses npm, despite `.cursorrules` mentioning pnpm).
- **Database**: Drizzle ORM + better-sqlite3. Migrations in `./drizzle`. The DB file lives in the project directory.
- **AI**: `@tanstack/ai` clients (use the `@tanstack/ai-openai` client against any OpenAI-compatible endpoint configured via `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME`).
- **Tests**: Vitest + jsdom (`vitest.config.ts`, tests live next to code as `*.test.ts(x)` under `src/`).

## Commands

```bash
npm run dev            # vite dev server on port 3000
npm run build          # production build (also regenerates routes)
npm run lint           # biome lint
npm run check          # biome lint + format check (run before committing)
npm run test           # vitest run (unit tests)
npm run test:watch     # vitest in watch mode
npm run test:coverage  # vitest run --coverage (Q36 floors: domain ≥ 90, server ≥ 80)
npm run db:generate    # drizzle-kit: generate migration from schema changes
npm run db:migrate     # apply migrations
npm run db:push        # push schema directly (dev-only)
npm run db:studio      # drizzle studio
npm run ci             # check + test + build (definition-of-done gate, Q45)
```

## Code conventions

- Biome is the linter/formatter: **2-space indent, single quotes for JS strings, double quotes for JSX attributes** (line width 80 — see `biome.json`). `src/routeTree.gen.ts` and `src/styles.css` are excluded — don't hand-edit the route tree, run `npm run generate-routes` (build) instead.
- Add new routes as files under `src/routes`; use `createFileRoute` and `Link` from `@tanstack/react-router`.
- Keep all DB and model access in server functions — client components must not import `better-sqlite3` or talk to the model directly.

## Environment

- Node **>= 22** is required (enforced via `engines` in `package.json` + `.nvmrc`, Q28).
- `.env` is **committed** with non-secret local defaults (`DATABASE_URL`, `OPENAI_*` local defaults, doc 07 §3.3); `.env.local` is **gitignored** for machine-specific overrides and secrets. Keep `DATABASE_URL` identical in both (drizzle-kit reads `.env.local` first).
- The AI endpoint is configured by `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME`. It defaults to a **local** endpoint; a remote endpoint is allowed only as an explicit, documented user opt-in. Never hardcode a remote host.

## Definition of done for a feature

- `npm run check`, `npm run test`, and `npm run build` pass.
- New and changed code is covered by unit tests: add/extend Vitest specs (`src/**/*.{test,spec}.{ts,tsx}`) for the logic you touched, and `npm run test` passes.
- No new **unconfigured** external network calls or telemetry (verify: the only outbound model calls go to `OPENAI_BASE_URL`; no new SDKs with phone-home/analytics). Prompt-safety guardrail (input treated as data, not commands) passes.
- AI behavior, if touched, still satisfies constraints 2–4 above.
