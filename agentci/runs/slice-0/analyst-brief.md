# Analyst Brief — slice-0 (Foundations)

> ⚠ **Pipeline gap discovered (P2):** the contract says "copy AC-## verbatim from the spec", but
> the setup slice has no spec file, so this brief **derives** acceptance criteria from
> doc 08 §3 + doc 04 §6 + doc 07 §10 + confirmed Qs, tagged `AC-S0-##` and marked *derived*.
> → the pipeline needs a derived-AC convention for spec-less slices (or doc 08 §3 should carry
> explicit obligations per slice).

## 1. Goal

Foundation of the app: confirmed schema in SQLite, pure DDD domain core with unit tests,
environment + tooling configured, so slices 1–4 can build on verified primitives.

## 2. In scope / Out of scope

**In (from doc 08 §3 row 0 + confirmed Qs):**
- `todos` schema → `threads` + `messages` (doc 04 §2)
- `.env` setup (Q18), DDD layout (doc 05 §8), first migration (doc 04 §6), `data/context.md`
  placeholder (FR-13)
- Q28 (Node ≥ 22 + engines/.nvmrc), Q44 (prune unused AI packages), Q45 (`npm run ci`)

**Out (explicit):**
- Any UI, server functions, repositories, model client (slices 1–3)
- Integration/E2E tests (Q37/Q38: MVP is unit-only)
- `generation_log` (Q16: not in v1)

## 3. Acceptance criteria checklist (DERIVED — see gap P2)

- [ ] **AC-S0-1** — `src/db/schema.ts` defines `threads` + `messages` exactly per doc 04 §2
  (Q2–Q6, Q19–Q21: 3 roles, soft-delete flags, ms/UTC, int IDs, 32 KB cap constant) + index.
- [ ] **AC-S0-2** — First migration generated in `./drizzle` and applied; DB file is whatever
  `DATABASE_URL` resolves to (Q18/D4).
- [ ] **AC-S0-3** — `.env` (committed) + `.env.local` (gitignored) share one `DATABASE_URL`
  (Q18); `ANTHROPIC_API_KEY` removed (Q25); `.env` holds non-secret local defaults only
  (doc 07 §3.3).
- [ ] **AC-S0-4** — DDD layout per doc 05 §8 holds for slice-0 code: `src/domain/thread/` is
  pure (no imports from `src/db`, `src/server`, React, or Node-only globals).
- [ ] **AC-S0-5** — `data/context.md` is a clearly-marked placeholder; no fabricated CV content
  (FR-13).
- [ ] **AC-S0-6** — Node ≥ 22 enforced: `engines` in `package.json` + `.nvmrc` (Q28).
- [ ] **AC-S0-7** — Unused scaffold AI packages pruned; only `@tanstack/ai-openai` kept (Q44).
- [ ] **AC-S0-8** — `npm run ci` runs check + test + build (Q45).
- [ ] **AC-S0-9** — Domain unit tests cover invariants I1–I7 and the Q6/Q21 rules, named by
  requirement ID (doc 09 §2.1, §4).
- [ ] **AC-S0-10** — Coverage floors enforceable per doc 09 §5 / Q36 (`vitest --coverage`
  runnable; `domain/` ≥ 90% measured). *(derived from Q36 — see gap P3 below)*

## 4. Confirmed decisions that shape this slice

- **D1** — Model B: editable (all roles) + soft-deletable messages (Q5/Q5a/Q5b) → `updatedAt`,
  `is_deleted`, edit-any-role in the domain.
- **D2** — No `recruiters` table; thread carries name+company; no uniqueness (Q2).
- **D4** — DB file via `DATABASE_URL` in `.env` (Q18).
- **D7** — One linear thread per chat; no status; soft-delete only (Q3/Q4).
- **Q6** — roles `recruiter | user_reply | user_note`, all in AI context.
- **Q19/Q20/Q21** — int IDs, ms/UTC, 32 KB cap.
- **Q36** — floors: `domain/` ≥ 90%, `server/` ≥ 80%.

## 5. Blocking questions

**NONE — cleared to design** (doc 10: all Q confirmed, D1–D7 locked).

Non-blocking gap found while verifying scope (**P3**, routed to coder stage): Q36 is confirmed
but `@vitest/coverage-v8` is not installed — the floor is currently *unenforceable*. Slice-0
remediation: add the package + `test:coverage` script + per-glob thresholds (doc 09 §5).
