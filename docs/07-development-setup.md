# 07 — Development Setup

**Status:** Draft → **Approved** (env model confirmed via Q18/Q29; Q8/Q25/Q26/Q27/Q28/Q30/Q44 confirmed)
**Audience:** anyone (human or agent) setting up or running the project locally.
**Develop/test platform:** macOS, Apple Silicon (M-series) — reference machine: Apple M3 Max.
**Code portability:** platform-agnostic (Q27 confirmed) — no macOS-only APIs; other platforms may
be supported later without code changes. No multi-platform CI for now.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **>= 22** (Q28 confirmed) | Add `engines` in `package.json` + `.nvmrc` (slice 0 action). |
| npm | 10.x (current) | This repo uses **npm** (not pnpm — see `.cursorrules` note). |
| Git | any recent | Apple Git on macOS is fine. |
| Xcode CLT | required | Needed to build `better-sqlite3` native module. |
| A model backend | user-managed | **Any OpenAI-compatible endpoint** (local by default) — see §6. |

> The app is **local-by-default**: no cloud accounts, no API keys, no remote services are *required*.
> The only "external" piece is the model endpoint you point `OPENAI_BASE_URL` at (local by default;
> a remote endpoint is a documented opt-in — doc 02 NFR-01).

---

## 2. Install

```bash
git clone <repo>
cd recruiter-responder-agent
npm install
```

`npm install` compiles `better-sqlite3` (native). If it fails, ensure Xcode Command Line Tools are
installed (`xcode-select --install`).

---

## 3. Environment configuration

### 3.1 The DB file is set by `DATABASE_URL` (Q18 confirmed)

> **Confirmed:** the SQLite file name is **not hardcoded** — it is whatever `DATABASE_URL`
> resolves to. The scaffold currently has two different values (`.env` → `sqlite.db`,
> `.env.local` → `dev.db`). **Action for slice 0:** pick one value, put it in `.env`, and make
> `.env.local` match (drizzle-kit reads `.env.local` first). Example: `DATABASE_URL="dev.db"`.

### 3.2 Target `.env` (single source for local dev)

```bash
# Database (SQLite file in the project directory) — Q18
DATABASE_URL="dev.db"

# Model backend: any OpenAI-compatible endpoint — Q10/Q29
# Local by default (oMLX / LM Studio / llama.cpp / vLLM). A remote endpoint is an opt-in.
OPENAI_BASE_URL="http://127.0.0.1:8080"
OPENAI_API_KEY="local"                 # placeholder for local servers; real key for remote
OPENAI_MODEL_NAME="<model-id>"         # Q9 — the model the endpoint serves

# Optional generation params — Q12 confirmed (defaults shown)
OPENAI_TEMPERATURE="0.2"
OPENAI_MAX_TOKENS="1024"
OPENAI_CONTEXT_WINDOW="8192"           # Q13 overflow budget
```

> **Note (Q25 confirmed):** the scaffold's leftover empty `ANTHROPIC_API_KEY` in `.env.local` is
> **removed** — the app uses `OPENAI_*` only.

### 3.3 `.env` vs `.env.local` policy

- `.env` — committed, non-secret defaults safe for all (here: `DATABASE_URL`, and the `OPENAI_*`
  local defaults).
- `.env.local` — gitignored, machine-specific overrides (e.g., a real remote key, a different port).
- **Rule:** keep `DATABASE_URL` identical in both (AGENTS.md). Secrets (a remote key) belong only in
  `.env.local`, never committed.

---

## 4. Run

```bash
npm run dev            # Vite + TanStack Start dev server on http://127.0.0.1:3000
```

- The **web server** binds to loopback by default (`127.0.0.1`) — NFR-02.1. Configurable via the
  dev/preview host if you want LAN access.
- Open `http://127.0.0.1:3000` in the browser.

### Production build (local)

```bash
npm run build          # production build + regenerates routes
npm run preview        # serve the production build locally
```

> Q30 (confirmed): both `dev` and `build` must work; `build` is part of the "definition of done".

---

## 5. Database (Drizzle + better-sqlite3)

```bash
npm run db:generate    # generate a SQL migration from src/db/schema.ts into ./drizzle
npm run db:migrate     # apply migrations to the DB file
npm run db:push        # push schema directly (dev-only, while schema is fluid)
npm run db:pull        # reverse-engineer schema from the DB (rare)
npm run db:studio      # Drizzle Studio GUI
```

- The DB **file** lives in the project directory, named by `DATABASE_URL` (Q18).
- Migrations live in `./drizzle`. **None exist yet** — the first migration is generated from the
  confirmed schema (doc 04).
- The scaffold's `todos` table is replaced by `threads` + `messages` (doc 04 §6).
- `drizzle.config.ts` reads `.env.local` first — keep it consistent with §3.

---

## 6. Model backend (any OpenAI-compatible endpoint) — Q29 confirmed

The app **does not** install or manage the model. You run any OpenAI-compatible server and point
`OPENAI_BASE_URL` at it. **Local by default; a remote endpoint is a documented opt-in.**

Examples of things `OPENAI_BASE_URL` can point at:
- **Local (default):** oMLX/MLX, LM Studio, llama.cpp (`server`), or vLLM — e.g.
  `http://127.0.0.1:8080`.
- **Remote (opt-in):** any OpenAI-compatible hosted endpoint — e.g. `https://host.example/v1`,
  with a real `OPENAI_API_KEY`. Data (CV + messages) is then sent to that service.

Configuration checklist for a working generation:
1. The endpoint is running and reachable at `OPENAI_BASE_URL`.
2. `OPENAI_MODEL_NAME` matches the served model id.
3. `OPENAI_API_KEY` is set (placeholder for local, real key for remote).
4. `data/context.md` exists and is non-empty (else `context_missing`).

> **Model status indicator (Q43 confirmed: must-have):** the app shows a live "model connected?"
> indicator (SF-08 `getModelStatus`), backed by a reachability probe of the endpoint's `/models`
> route (or equivalent) — the same `OPENAI_BASE_URL`, no new endpoint (doc 06 §7.1).

---

## 7. Project layout & conventions

### 7.1 Directory conventions (see doc 05 §8 for the DDD layout)

```
docs/            # THIS spec set (source of truth for what/why)
specs/           # per-feature SDD specs (the heart of spec-driven dev)
data/            # context.md (user CV) — placeholder committed, real content gitignored
drizzle/         # generated SQL migrations
src/
  domain/        # pure domain (no DB/React/AI imports) — fully unit-testable
  server/        # server functions, model client, context service (server-only)
  db/            # schema + repositories (Drizzle)
  components/    # shadcn UI (client)
  routes/        # TanStack Start file routes (client)
  lib/           # client-safe utils (cn, etc.)
```

### 7.2 Code style (Biome)

- **Tabs** for indentation, **double quotes** (Biome config). Run `npm run check`.
- Do **not** hand-edit `src/routeTree.gen.ts` (regenerated on build) or `src/styles.css`
  formatting.
- TypeScript `strict`; no `any` in `domain/` or `server/`.
- Path aliases: `#/*` and `@/*` → `./src/*`.

### 7.3 UI components (shadcn)

- shadcn is configured (`components.json`, style `new-york`, base `zinc`, icon `lucide`).
- Add components with: `npx shadcn@latest add <name>` (**npm**, despite `.cursorrules` saying pnpm).
- Components land in `src/components` (UI in `src/components/ui`).

### 7.4 Server/client boundary (hard rule)

- **All** DB and model access is in `createServerFn`s under `src/server/`.
- Client components **never** import `better-sqlite3` or call the model.
- The client imports only server-function handles.

---

## 8. The `data/context.md` placeholder

`data/context.md` does not exist yet. Per AGENTS.md, create it as a **clearly-marked placeholder**
the user fills in — **never fabricate CV content**:

```markdown
# My CV & Project History (single source of truth for the AI)

<!--
  FILL THIS IN. This file is the ONLY CV input the AI uses (PRD constraint 2).
  Replace the placeholder sections below with your real, concise CV + project history.
  Keep it factual — the model must not have to invent anything.
-->

## Summary
<!-- 1–3 lines on your role and focus. -->

## Skills
<!-- Bullet list of technologies/skills you actually want the AI to reference. -->

## Experience / Projects
<!-- Role, company, dates, and concrete (but true) facts and metrics. -->
```

> Q22 confirmed: if this file is missing/empty, generation is blocked with a clear message.

---

## 9. First-run checklist (new machine)

1. `npm install`
2. Create/verify `.env` per §3.2 (one `DATABASE_URL`; `OPENAI_BASE_URL`/`OPENAI_API_KEY`/
   `OPENAI_MODEL_NAME`). Remove the leftover `ANTHROPIC_API_KEY`.
3. `npm run db:generate && npm run db:migrate` (initial schema, per doc 04).
4. Fill in `data/context.md` (replace placeholder).
5. Start your model backend and confirm it's reachable at `OPENAI_BASE_URL` (§6).
6. `npm run dev` → open `http://127.0.0.1:3000`.
7. Verify: create a thread → add messages → click Generate → draft appears → commit → edit/delete.

---

## 10. Cleanup of scaffold leftovers (confirmed actions)

- **Q25:** remove the empty `ANTHROPIC_API_KEY` from `.env.local`.
- **Q18:** unify `DATABASE_URL` to one file in `.env` and `.env.local`.
- Replace `todos` schema with `threads`/`messages`.
- **Q44 (confirmed):** prune unused scaffold AI client packages (`@tanstack/ai-anthropic`,
  `@tanstack/ai-gemini`, `@tanstack/ai-ollama`); keep `@tanstack/ai-openai` only (required).
