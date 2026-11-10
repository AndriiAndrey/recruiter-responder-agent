# Architect Plan — slice-0 (RETRO mode: as-built audit + remediation)

> ⚠ **Pipeline gap discovered (P4):** the architect stage is defined for *future* design
> ("signatures only, no implementation"). A retro run needs an explicit **as-built audit mode**
> (map what exists, score it against the rules, propose remediation). → added to the agent file.

## 1. File map (as built)

| Path | Purpose | Size | Compliance |
|------|---------|------|------------|
| `src/db/schema.ts` | threads+messages + index (doc 04 §2) | 58 | ✅ |
| `src/db/index.ts` | Drizzle instance, WAL, FK on | 22 | ✅ |
| `src/domain/thread/thread.ts` | `Thread` aggregate + `ThreadSummary` VO + `ThreadPolicyError` | **201** | ⚠ over ~200 ceiling; 3 concerns in one file |
| `src/domain/thread/message.ts` | `Message` entity + `MessageRole` | 82 | ✅ |
| `src/domain/thread/message-policy.ts` | `MessagePolicyError` + validation | 54 | ✅ |
| `src/domain/thread/events.ts` | `ThreadEvent` types | 32 | ✅ (types only, emission later) |
| `src/domain/thread/index.ts` | barrel | 6 | ⚠ wildcard `export *` × 4 |
| `src/domain/thread/*.test.ts` | 39 tests | 349 | ✅ (tests exempt from size ceiling) |
| `data/context.md`, `.env`, `.nvmrc`, `drizzle/` | slice-0 assets | — | ✅ |

AC traceability: AC-S0-1→schema.ts, AC-S0-2→drizzle/+db index, AC-S0-3→.env/.env.local/.gitignore,
AC-S0-4→domain/thread/*, AC-S0-5→data/context.md, AC-S0-6→package.json+.nvmrc, AC-S0-7→package.json,
AC-S0-8→package.json, AC-S0-9→*.test.ts, AC-S0-10→**missing** (no coverage tooling — see §5).

## 2. Entity folders (rule check)

- `src/domain/thread/` — ✅ own folder, related files colocated, test + types + policy present.
  ⚠ types (`ThreadSummary`, `ThreadPolicyError`) live inside `thread.ts` instead of a
  `types.ts` — the folder convention (component/types/utils/test) is not fully followed.

## 3. Shared layer (reuse-first check)

- Domain exports are the intended shared surface (pure) ✅ — no client/server duplication exists
  yet (no server layer yet).
- ⚠ Barrel uses `export *` — the "explicit exports only" discipline is unenforceable with
  wildcards, and `events.ts` (not consumed by anything yet) is already leaking out.

## 4. Layer discipline

- No client import of `src/db`/`src/server` (scout verified) ✅
- `src/db/index.ts` is the only Drizzle touchpoint; domain is pure ✅
- `events.ts` emission deferred to slice 1+ — consistent with doc 05 §5 ✅

## 5. Remediation plan (for the coder stage)

| # | Change | AC | Justification |
|---|--------|----|---------------|
| R1 | Split `thread.ts`: move `ThreadSummary` + `ThreadPolicyError` into new `src/domain/thread/types.ts` (VO + errors are value-object territory, doc 05 §3.3); `thread.ts` imports them | AC-S0-4 | Follows the entity-folder convention (types.ts); drops aggregate to ~165 lines |
| R2 | Replace `export *` in `index.ts` with **explicit named exports** of the consumed public API (`Thread`, `Thread.rehydrate` is a static — name it; `Message`, `MessageRole`, `MESSAGE_ROLES`, `isMessageRole`, `MessagePolicyError`, `ThreadPolicyError`, `ThreadSummary`, `MAX_MESSAGE_BODY_BYTES`, `assertValidBody`, `assertValidMessage`, `ThreadEvent`) | — | Barrel discipline: explicit, auditable, no wildcards |
| R3 | Install `@vitest/coverage-v8`; add `test:coverage` script + per-glob thresholds in `vitest.config.ts` (`src/domain/**` ≥ 90; `src/server/**` ≥ 80, include-glob keeps it inert until the dir exists) | AC-S0-10 | Q36 floor currently unenforceable |

No new shared utils/types needed — reuse baseline fully covered by R1/R2.

## 6. Design-rule observations (pipeline improvements, P5/P6)

- **P5 — size ceiling is brittle:** 201 vs 200 fails a file that is otherwise one concern.
  Propose: *target ≤ ~150; > 200 requires a one-line justification in the plan; > 300 or a
  second concern ⇒ mandatory split.*
- **P6 — barrel rule needs a concrete form:** "exports only what is consumed" is unenforceable
  with zero consumers yet. Propose: *explicit named exports of the module's public API; no
  wildcards; reviewer audits for dead exports once consumers exist.*
