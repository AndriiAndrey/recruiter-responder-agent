# Review Report — slice-0 (retro-audit, post-remediation)

Reviewer ran the gates fresh (loop iteration included). Verdict at bottom.

## 1. AC verdicts (from analyst brief)

| AC | Verdict | Evidence |
|----|---------|----------|
| AC-S0-1 schema | pass | `src/db/schema.ts:14-60` (doc 04 §2 fields, 3 roles, soft-delete, ms/UTC, index) + tests `message-policy.test.ts` (Q6/Q21), `thread.test.ts` (I1/I2/I3/Q19) |
| AC-S0-2 migration + DATABASE_URL | pass | `drizzle/0000_*.sql` applied; `dev.db` created; `src/db/index.ts:13-16` reads `DATABASE_URL` |
| AC-S0-3 env policy | pass | `.env` committed (non-secret defaults), `.env.local` gitignored via `*.local`, both `DATABASE_URL="dev.db"`, no `ANTHROPIC_API_KEY` |
| AC-S0-4 DDD layout / purity | pass | `src/domain/thread/` entity folder with `types.ts` after R1; grep: zero `db/server/react/node:` imports in `src/domain` |
| AC-S0-5 context.md placeholder | pass | `data/context.md` marked placeholder, no fabricated CV, privacy note |
| AC-S0-6 Node ≥ 22 | pass | `package.json` `engines.node >=22` + `.nvmrc` (22) |
| AC-S0-7 AI packages pruned | pass | `package.json` deps: only `@tanstack/ai-openai` among `ai-*` (plus core/client/react) |
| AC-S0-8 `npm run ci` | pass | `package.json` script `check && test && build`; run: exit 0 |
| AC-S0-9 tests I1–I7 by ID | pass | 40 tests, named by I/Q/AC ID; tie-break case added in loop (F2) |
| AC-S0-10 coverage floor | pass | `npm run test:coverage` (added in R3): domain **100/100/100/100** ≥ 90 floor (Q36) |

## 2. Invariant checklist

- [x] **Server/client seam** — grep over `src/routes|components|lib`: zero imports of `src/db`/`src/server`
- [x] **Privacy (NFR-01)** — **was FAILING, fixed in loop (F1)**: `src/styles.css:1` imported
      Google Fonts (unconfigured external fetch). Removed; font stacks fall back to system
      fonts. Re-grep: zero `http(s)://` in `src/` (non-test). New dep `@vitest/coverage-v8`
      is local instrumentation only (no network).
- [x] **Prompt safety / PRD-2/3/4** — n/a (slice 0 touches no AI path; guardrail tests start slice 3)
- [x] **Platform-agnostic (NFR-05.1/Q27)** — domain is pure TS (TextEncoder, no Node APIs); no OS-specific paths
- [x] **File-size discipline** — largest impl file `thread.ts` = 183 lines (was 201, split in R1); all ≤ ~200
- [x] **Entity folders + barrel** — `types.ts` added per convention; `index.ts` now explicit named exports, no wildcards (R2); no dead exports (no external consumers yet)
- [x] **Reuse** — no duplicated utils/types; domain exports remain the single shared surface
- [x] **Tests unmodified by coder** — coder diff shows zero test changes; test change below was made by the **tester** in the loop (legit)

## 3. Findings

| # | Blocking? | Sev | File | Description | Routed to | Resolution |
|---|-----------|-----|------|-------------|-----------|------------|
| F1 | **yes** | high | `src/styles.css` | Remote Google Fonts `@import` = unconfigured external fetch (violates NFR-01.2/AGENTS rule 1) | coder | **fixed** — import removed; system fallbacks already in both font stacks |
| F2 | no | low | `thread.test.ts` | I2 tie-break (equal `createdAt` → id) was untested (branch 169 uncovered) | tester | **fixed** — "I2: ties on createdAt are broken by id" added; branches now 100% |
| F3 | no | info | vitest | Coverage **text** table lists one file only (JSON/HTML reporters complete) | — | note only; `coverage/` gitignored; JSON used for the gate |

## 4. DoD check (doc 08 §5) — run by reviewer

- `npm run check` ✅ (exit 0)
- `npm run test` ✅ (40/40)
- `npm run build` ✅
- `npm run test:coverage` ✅ (domain ≥ 90 floor; 100/100/100/100)
- Coverage floors (Q36): domain **meets** ≥ 90; `src/server/**` glob inert until slice 1
- No new unconfigured external calls / telemetry: **after F1 fix — clean** (was failing before)
- PRD constraints 2–4: untouched by slice 0 (no AI)

## 5. Verdict

**APPROVED** — zero open blocking findings (F1 resolved in-loop, F2 resolved in-loop, F3 info).
Loop count: 1 (within the 2-loop cap). Slice 0 re-verified end-to-end.
