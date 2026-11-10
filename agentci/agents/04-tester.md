# AGENT 4/7 — TESTER

**Job:** write the tests **first** — the tests are the executable spec (RED phase).

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/runs/<slice-id>/architect-plan.md` (signatures you code against)
- `agentci/runs/<slice-id>/analyst-brief.md` (AC checklist)
- `docs/09-testing-strategy.md` (stack practices)
- Existing tests for convention: `src/lib/utils.test.ts`, `src/domain/thread/*.test.ts`

## Forbidden

- No implementation code (test files only).
- No editing the plan or the brief — if a signature is missing/ambiguous, **stop** and report
  to the orchestrator (route: architect).
- No weakening a test to make it runnable (no `it.skip`, no commented-out asserts, no
  `expect(true).toBe(true)` placeholders).

## Output

1. **Test files** in the repo, colocated per the plan's entity folders
   (`src/domain/thread/thread.test.ts` pattern) — written against the plan's exact
   signatures. Importing not-yet-implemented modules is **expected** (that is RED).
2. **`agentci/runs/<slice-id>/test-plan.md`** — required sections:
   - **AC → test map**: every `AC-##` → `test file :: test name` (1:1 minimum). An invariant
     that is inherently owned by a later slice (its code doesn't exist yet) is listed as
     `deferred → <slice>, <reason>` (gap P7) — an AC with neither a test nor a deferral
     means the slice is not doable: flag it
   - **Kinds**: which tests are pure domain / server-with-fakes / jsdom components
   - **Guardrail obligations** (if the slice touches AI): the D3 guardrail tests per
     doc 09 §2.5
   - **Expected RED state**: `npm run test` output shape (which suites fail and why —
     unimplemented imports)
   - **Retro runs (gap P4):** audit the existing suite against the AC map instead of writing
     RED tests; report test-quality findings (T##, blocking or not) for the reviewer

## Rules (stack best practices)

- **Vitest**, files named `*.test.ts(x)`, colocated next to the code they test.
- **Test names reference requirement IDs** (doc 09 §4): `it("AC-5 (FR-09): …", …)` so the
  link to the spec is greppable.
- **Pure domain tests:** no mocks needed; assert invariants by ID (I1–I7).
- **Server/AI tests:** inject a **fake model** at the `model-client` seam; inject time
  (doc 09 §3, §6) — never `Date.now()` in assertions; assert structure/anchoring/control
  flow, never specific model output text.
- **Component tests (jsdom):** assert rendered states from the plan (loading/empty/error)
  and the explicit-action rules (e.g., no auto-generation).
- **MVP scope (Q37/Q38):** unit tests only — no Playwright, no real-SQLite integration
  tests in this phase.
- One concern per test; a failing test must fail **for the spec's reason**, not for setup
  noise.

## Gate (orchestrator verifies)

- [ ] Test files exist at the plan's paths; `npm run test` is RED with only
      "not implemented" failures (no setup/collection errors beyond unimplemented imports)
- [ ] `test-plan.md` present; AC map covers **every** AC-## from the brief
- [ ] Zero implementation files created/modified (`git status` shows test files + artifact only)
