# Scout Report — slice-0 (Foundations)

**Spec:** none — slice 0 is the "(setup)" slice in `docs/08-workflow.md` §3 (no `docs/specs/` file).
Reference documents: `docs/04-data-model.md`, `docs/05-domain-model-ddd.md` §8, `docs/07-development-setup.md`.

> ⚠ **Pipeline gap discovered (P1):** the scout/analyst contract assumes an assigned spec file
> (`docs/specs/{{SPEC_ID}}.md`), but slice 0 has none. This run used doc 08 §3 + docs 04/05/07 as
> the spec stand-in. → the pipeline needs a fallback for spec-less (setup) slices.

## 1. Task surface

Slice 0 = foundations per doc 08 §3: replace `todos` schema with `threads`/`messages`, set up
`.env`, DDD layout, first migration, `data/context.md` placeholder — plus confirmed additions
Q28 (engines/.nvmrc), Q44 (prune AI packages), Q45 (`npm run ci`).

## 2. Existing code map

| Area | Path | State |
|------|------|-------|
| Schema | `src/db/schema.ts:14-60` | implemented — `threads` + `messages` per doc 04 §2, `messages_thread_created_idx`, FK cascade |
| DB instance | `src/db/index.ts:16-24` | implemented — better-sqlite3 + WAL + `foreign_keys=ON`, throws without `DATABASE_URL` |
| Migrations | `drizzle/0000_unusual_phantom_reporter.sql` | implemented — applied to `dev.db` (gitignored) |
| Domain: Thread agg | `src/domain/thread/thread.ts` (201 lines) | implemented — `create/rehydrate/assignId/addMessage/editMessage/deleteMessage/activeMessages/markDeleted/lastActivity/toSummary`; `ThreadPolicyError` codes |
| Domain: Message | `src/domain/thread/message.ts` (82 lines) | implemented — `MessageRole`, `Message` entity, `toPromptLine` |
| Domain: policy | `src/domain/thread/message-policy.ts` (54 lines) | implemented — `MessagePolicyError`, `MAX_MESSAGE_BODY_BYTES=32768` |
| Domain: events | `src/domain/thread/events.ts` (32 lines) | types only — `ThreadEvent` union (emission deferred to slice 1+, by design) |
| Domain barrel | `src/domain/thread/index.ts:3-6` | `export *` × 4 (wildcard re-exports) |
| Domain tests | `src/domain/thread/{thread,message,message-policy}.test.ts` (39 tests) | implemented — colocated, named by I/Q/AC ID |
| Server layer | `src/server/` | **missing** (expected — slices 1–3) |
| Repositories | `src/db/repositories/` | **missing** (expected — slice 1) |
| UI routes | `src/routes/index.tsx` (14 lines) | demo placeholder (slice 1 replaces) |
| UI components | `src/components/` | **missing** (slice 1) |
| Shared lib | `src/lib/utils.ts` (7 lines) | `cn()` only (+test) |
| Env | `.env` (committed), `.env.local` (gitignored) | implemented — both `DATABASE_URL="dev.db"`; `ANTHROPIC_API_KEY` removed; `OPENAI_*` defaults |
| CV placeholder | `data/context.md` | implemented — marked placeholder, privacy note |
| Tooling | `package.json` (`engines >=22`, `ci` script), `.nvmrc` (22) | implemented — Q28/Q45; `@tanstack/ai-*` pruned to openai (Q44) |

## 3. Reusable shared code

| Path | Provides |
|------|----------|
| `src/domain/thread/index.ts` | `Thread`, `Message`, `MessageRole`, `MESSAGE_ROLES`, `isMessageRole`, `MessagePolicyError`, `ThreadPolicyError`, `MAX_MESSAGE_BODY_BYTES`, `assertValidBody/Message`, `ThreadEvent` — pure, client+server safe |
| `src/lib/utils.ts` | `cn()` (class merge) for UI |
| `src/db/index.ts` | `db` (Drizzle instance) — **server-only**, never from client |
| `drizzle/` | migrations; schema source of truth `src/db/schema.ts` |

## 4. Scaffold leftovers / risks

- `src/routes/index.tsx` demo page + `.gitignore` line `todos.json` (file itself already gone).
- `@tanstack/ai-react`, `@tanstack/react-devtools`, `streamdown`, `highlight.js` deps — unused by
  slice 0; may serve slices 1–3 or be pruned later (not part of Q44).
- **`@vitest/coverage-v8` not installed** — Q36 coverage floors (doc 09 §5) currently
  unenforceable; `vitest --coverage` would fail.
- `src/domain/thread/index.ts` uses wildcard `export *` — barrel discipline (explicit exports of
  consumed API) not yet applied.
- `thread.ts` is 201 lines — 1 line over the architect's ~200 ceiling (see findings).

## 5. Conventions observed

- Biome: 2-space indent, single quotes (JS) / double (JSX), width 80 (`biome.json`).
- Imports use explicit `.ts` extensions (bundler mode); tests colocated as `*.test.ts`.
- Test names reference requirement IDs (`I2:`, `Q5a:`, `AC-1`) per doc 09 §4.
