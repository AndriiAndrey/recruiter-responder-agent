# AgentCI — Delivery Pipeline (7 specialised subagents)

**Status:** Active process (supplements [`../docs/08-workflow.md`](../docs/08-workflow.md) §2–§5)
**Purpose:** deliver each slice/spec through seven narrow, single-job stages. Each subagent gets
**its own instruction file and a small, declared context** — no long all-in-one prompt. Small
context in → consistent output out.

## Why seven agents

| Problem with one long prompt | How the pipeline fixes it |
|------------------------------|---------------------------|
| Context bloat (whole repo + whole spec + whole codebase in one window) | Each agent reads **only its declared inputs** (a whitelist) |
| Role drift (designing while coding while documenting) | One narrow job per agent; scope is enforced in its instruction file |
| Inconsistent output across features | Every stage emits a **fixed-shape artifact** the next stage consumes |
| Undetected regressions of conventions | The reviewer re-checks invariants from a clean checklist, not from memory |

## The pipeline

```
 task (slice ID + spec ID)
        │
        ▼
 1. SCOUT      → scout-report.md      "what exists" (facts + paths, no opinions)
        │
        ▼
 2. ANALYST    → analyst-brief.md     "what exactly to build" (AC checklist; blocks on open Qs)
        │  ⛔ stops for the user if any blocking question is unresolved
        ▼
 3. ARCHITECT  → architect-plan.md    "how" (file map, APIs, reuse plan — signatures only)
        │
        ▼
 4. TESTER     → test files (RED) + test-plan.md   "tests first, named by requirement ID"
        │
        ▼
 5. CODER      → green suite          "implement the plan; do not touch tests to force green"
        │
        ▼
 6. REVIEWER   → review-report.md     "verify AC-by-AC + invariants; fix nothing"
        │  ↺ blocking findings → back to coder (or tester/architect if the fault is theirs)
        ▼
 7. DOCUMENTER → docs synced + commit "spec → Implemented, changelog, AGENTS.md state"
```

## Artifacts (one folder per slice)

```
agentci/runs/<slice-id>/
  scout-report.md
  analyst-brief.md
  architect-plan.md
  test-plan.md
  review-report.md
```

Artifacts are **committed** (history of decisions, per Q41). A stage may not start until the
previous stage's artifact exists and its gate (below) holds.

## Stage contract (what every instruction file contains)

1. **Job** — one sentence, narrow.
2. **Inputs (read only these)** — the context whitelist.
3. **Forbidden** — explicit "do not" list (keeps scope from leaking in).
4. **Output** — artifact path + required sections.
5. **Rules** — the stack best practices for that role.
6. **Gate** — the condition the orchestrator verifies before the next stage.

Instruction files (run in this order — the number prefix enforces it):

| # | Agent | File | Job |
|---|-------|------|-----|
| 1 | Scout | [`agents/01-scout.md`](./agents/01-scout.md) | Map the repo surface the slice touches; list reusable shared code |
| 2 | Analyst | [`agents/02-analyst.md`](./agents/02-analyst.md) | Turn spec + decisions into an unambiguous brief; escalate open questions |
| 3 | Architect | [`agents/03-architect.md`](./agents/03-architect.md) | Minimal design: file map, entity folders, shared-layer reuse, signatures only |
| 4 | Tester | [`agents/04-tester.md`](./agents/04-tester.md) | Write the tests first (RED), named by requirement ID, per our stack practices |
| 5 | Coder | [`agents/05-coder.md`](./agents/05-coder.md) | Implement exactly the plan; repository pattern (backend), atomic design (frontend) |
| 6 | Reviewer | [`agents/06-reviewer.md`](./agents/06-reviewer.md) | Verify AC-by-AC + invariants from a clean checklist; report, don't fix |
| 7 | Documenter | [`agents/07-documenter.md`](./agents/07-documenter.md) | Sync spec/PRD/AGENTS.md with what actually shipped |

## Orchestrator protocol (the main agent)

For each stage:

1. **Spawn the stage with exactly this frame** (substitute values):

   ```
   You are the <ROLE> stage of the AgentCI pipeline for <SLICE-ID> (<SPEC-ID>).
   Read ONLY: agentci/agents/<NN>-<role>.md, then the files listed in its "Inputs" section.
   Do not read or edit anything else. Produce the artifact(s) defined in its "Output" section
   under agentci/runs/<slice-id>/. If its "Gate" cannot be met, or it lists blocking
   questions, STOP and surface them to the user — do not assume.
   ```

2. **Verify the gate** (checklist in the instruction file) before starting the next stage.
3. **Never merge roles.** If a stage needs work outside its job (e.g., coder discovers the plan
   is wrong), it stops and reports; the orchestrator routes back (below).

## Failure routing

| Fault found by | Route back to | Example |
|----------------|---------------|---------|
| Reviewer | **Coder** | AC not met, invariant violated, file too big |
| Reviewer | **Tester** | The test itself contradicts the spec/plan |
| Reviewer | **Architect** | Design doesn't fit the stack (wrong layer, missing contract) |
| Coder | **Architect** | Plan is ambiguous/impossible as written (no guessing) |
| Analyst | **User** | A blocking question with no decision in doc 10 |

Max **2 loops** per stage pair before escalating to the user with the loop history.

## Non-negotiables (every stage, no exceptions)

From the PRD/AGENTS.md — repeated here because each subagent's context is deliberately small:

1. **Local-by-default, no telemetry.** Only outbound model calls go to `OPENAI_BASE_URL`;
   never add telemetry/analytics or unconfigured external endpoints.
2. **Server/client seam.** Client code never imports `better-sqlite3` or the model client;
   all DB/model access lives in `createServerFn`s.
3. **Spec is the contract.** Implement the spec's acceptance criteria — nothing extra, nothing
   skipped. If behavior isn't in a spec, it isn't agreed.
4. **Definition of done** (doc 08 §5): `npm run check` + `npm run test` + `npm run build`
   (i.e. `npm run ci`) pass; new/changed logic covered by tests; docs updated in the same change.
