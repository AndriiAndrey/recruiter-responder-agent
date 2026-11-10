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

## Current state (as of scaffold)

- TanStack Start app is scaffolded and running; `src/routes/index.tsx` is still the demo page — the real UI is not built yet.
- `src/db/schema.ts` still contains the default `todos` table. Replace/extend it with the recruiter thread + message schema (recruiter name, company, thread ID, message role/sender, body, created-at). The exact schema fields are intentionally open in the PRD — propose a minimal schema consistent with the constraints above.
- `data/context.md` does not exist yet. Create it as a clearly-marked placeholder the user fills in; never fabricate CV content.
- No model client code exists yet. Wire it through a server function so the `OPENAI_*` config stays server-side.
- `README.md` is still the TanStack template — update it once features land.

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
npm run db:generate    # drizzle-kit: generate migration from schema changes
npm run db:migrate     # apply migrations
npm run db:push        # push schema directly (dev-only)
npm run db:studio      # drizzle studio
```

## Code conventions

- Biome is the linter/formatter: **tabs for indent, double quotes** for JS/TS. `src/routeTree.gen.ts` and `src/styles.css` are excluded — don't hand-edit the route tree, run `npm run generate-routes` (build) instead.
- Add new routes as files under `src/routes`; use `createFileRoute` and `Link` from `@tanstack/react-router`.
- Keep all DB and model access in server functions — client components must not import `better-sqlite3` or talk to the model directly.

## Environment

- `.env` / `.env.local` are gitignored. The SQLite file is named by `DATABASE_URL` — set it in `.env` (drizzle-kit reads `.env.local` first) and keep both files consistent.
- The AI endpoint is configured by `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME`. It defaults to a **local** endpoint; a remote endpoint is allowed only as an explicit, documented user opt-in. Never hardcode a remote host.

## Definition of done for a feature

- `npm run check`, `npm run test`, and `npm run build` pass.
- New and changed code is covered by unit tests: add/extend Vitest specs (`src/**/*.{test,spec}.{ts,tsx}`) for the logic you touched, and `npm run test` passes.
- No new **unconfigured** external network calls or telemetry (verify: the only outbound model calls go to `OPENAI_BASE_URL`; no new SDKs with phone-home/analytics). Prompt-safety guardrail (input treated as data, not commands) passes.
- AI behavior, if touched, still satisfies constraints 2–4 above.
