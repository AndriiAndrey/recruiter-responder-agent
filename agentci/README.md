# AgentCI — Delivery Pipeline (7 specialised subagents)

**Status:** Active process (supplements [`../docs/08-workflow.md`](../docs/08-workflow.md) §2–§5)
**Purpose:** deliver each slice/spec through seven narrow, single-job stages. Each subagent
gets **its own instruction file and a small, declared context** — no long all-in-one prompt.
Small context in → consistent output out. All stages work **inside one shared brief file
per slice** (D9) — one place to read the prior decisions, one place to add the work
summary, one place to track open items.

## Why seven agents

| Problem with one long prompt | How the pipeline fixes it |
|------------------------------|---------------------------|
| Context bloat (whole repo + whole spec + whole codebase in one window) | Each agent reads **only its declared inputs** (a whitelist) |
| Role drift (designing while coding while documenting) | One narrow job per agent; scope is enforced in its instruction file |
| Inconsistent output across features | Every stage appends a **fixed-shape section** to the shared brief; later stages read (and must comply with) all prior sections |
| Undetected regressions of conventions | The reviewer re-checks invariants + decision compliance from a clean checklist, not from memory |
| Decisions scattered / open items lost | One brief per slice: findings with pros/cons, user answers, work summaries, and a rolling open-items ledger in a single file |

## The pipeline

```
 task (slice ID + spec ID)
        │
        ▼
 1. SCOUT      → brief §1   "what exists" (facts + paths, no opinions)
        ▼
 2. ANALYST    → brief §2   "what exactly to build" — findings + options (pros/cons),
        │          AC checklist, questions
        │    ⛔ review gate: STOP until the user answers every question in §2.4
        ▼
 3. ARCHITECT  → brief §3   "how" — decision compliance + file map, APIs (signatures only)
        ▼
 4. TESTER     → brief §4 + test files (RED)   "tests first, named by requirement ID"
        ▼
 5. CODER      → brief §5 + green suite   "implement the plan; never edit tests to force green"
        ▼
 6. REVIEWER   → brief §6   "verify AC-by-AC + invariants + decision compliance; fix nothing"
        │    ↺ blocking findings → back to coder (or tester/architect if the fault is theirs)
        ▼
 7. DOCUMENTER → brief §7 + docs synced + commit   "spec → Implemented, changelog, AGENTS.md"
```

## The shared brief (single source of truth per slice, D9)

One MD file per slice, directly in `agentci/runs/`: **`agentci/runs/<DD.MM.YY>_<work-title>.md`** —
the **date prefix is the day the brief is created** (slice start; the folder then reads as a
chronological history, no subfolders needed), and the name is **the title of the work to be
done** — short and readable: kebab-case, ≤ ~3 words, from the spec's Goal
(e.g. slice 1 → `11.11.26_thread-crud.md`); spec-less slices take it from the doc 08 §3 row
(e.g. slice 0 → `10.11.26_foundations.md`). The scout creates it from
[`template/brief.md`](./template/brief.md); every stage appends its own numbered section.

Rules:

1. **One file per slice, all stages inside it.** No separate per-stage artifact files.
2. **Append-only sections.** A stage writes only its own section; earlier sections (work
   summaries) are history — never edited or deleted.
3. **Decisions = current state.** The analyst's Q&A rows (§2.4) and ledger statuses (§8)
   are edited **in place** when a decision changes. Changing a decision: add a new §8
   ledger entry (type `decision-change`, referencing the item) and route back to
   analyst/user — then edit the original row to the new state. No trail of old states.
4. **Stay in line.** Every stage from architect onward opens its section with a
   **decision-compliance** mapping of each prior decision its work depends on. A
   contradiction is never resolved inside a section — it becomes a ledger entry and
   routes back.
5. **Open items ledger (§8)** is the single rolling log for questions, findings, risks,
   and decision changes raised by any stage — the place to revisit when something needs
   investigation or clarification.
6. The brief is **committed** with the slice (history of decisions, Q41/D9). A stage may
   not start until the previous stage's section exists and its gate holds.

## Slice kinds

- **Spec slices** (normal): `{{SPEC_ID}}` is a file in `docs/specs/`; its ACs are copied
  verbatim into the analyst section of the brief.
- **Spec-less (setup) slices** (gaps P1/P2, e.g. slice 0 in doc 08 §3): no spec file — stages
  use the doc 08 §3 slice row + the docs it cites as the spec stand-in; the analyst derives
  ACs (`AC-<slice>-##`, marked *derived*); the documenter records "done" in doc 08 §3 instead
  of a spec status.
- **Retro runs** (gap P4): the pipeline audits already-shipped code (rehearsal). The
  architect runs as-built audit mode and emits a remediation plan (R##); the tester audits
  the existing suite (T##); coder and reviewer otherwise behave as forward.

## Stage contract (what every instruction file contains)

1. **Job** — one sentence, narrow.
2. **Inputs (read only these)** — the context whitelist (always includes the shared brief).
3. **Forbidden** — explicit "do not" list (keeps scope from leaking in).
4. **Output** — which brief section(s) to append + required content (+ code/tests where
   applicable).
5. **Rules** — the stack best practices for that role.
6. **Gate** — the condition the orchestrator verifies before the next stage.

Instruction files (run in this order — the number prefix enforces it):

| # | Agent | File | Job | Writes |
|---|-------|------|-----|--------|
| 1 | Scout | [`agents/01-scout.md`](./agents/01-scout.md) | Map the repo surface the slice touches; list reusable shared code | creates the brief; §1 |
| 2 | Analyst | [`agents/02-analyst.md`](./agents/02-analyst.md) | Findings + proposed solutions (pros/cons) + ACs; escalate every question to the user | §2 |
| 3 | Architect | [`agents/03-architect.md`](./agents/03-architect.md) | Minimal design: decision compliance, file map, reuse plan, signatures only | §3 |
| 4 | Tester | [`agents/04-tester.md`](./agents/04-tester.md) | Write the tests first (RED), named by requirement ID, per our stack practices | §4 + test files |
| 5 | Coder | [`agents/05-coder.md`](./agents/05-coder.md) | Implement exactly the plan; repository pattern (backend), atomic design (frontend) | §5 + code |
| 6 | Reviewer | [`agents/06-reviewer.md`](./agents/06-reviewer.md) | Verify AC-by-AC + invariants + decision compliance; report, don't fix | §6 |
| 7 | Documenter | [`agents/07-documenter.md`](./agents/07-documenter.md) | Sync spec/PRD/AGENTS.md with what actually shipped | §7 + doc edits |

## Orchestrator protocol (the main agent)

For each stage:

1. **Spawn the stage with exactly this frame** (substitute values):

   ```
   You are the <ROLE> stage of the AgentCI pipeline for <SLICE-ID> (<SPEC-ID>).
   Read ONLY: agentci/agents/<NN>-<role>.md, the shared brief
   agentci/runs/<DD.MM.YY>_<work-title>.md (all sections before yours), and the files
   listed in its "Inputs" section. Do not read or edit anything else. Append your section
   to the brief as defined in its "Output" section. If its "Gate" cannot be met, or it
   lists open questions, STOP and surface them to the user — do not assume.
   ```

2. **Verify the gate** (checklist in the instruction file) before starting the next stage;
   update the §0 `State` + loop history.
3. **Analyst review gate:** after §2, if any §2.4 row is `open`, present §2.2–§2.4 to the
   user (findings + options + questions); the pipeline stays stopped until the answers are
   written into §2.4 (current state).
4. **Never merge roles.** If a stage needs work outside its job (e.g., coder discovers the
   plan is wrong), it stops and reports; the orchestrator routes back (below).

## Failure routing

| Fault found by | Route back to | Example |
|----------------|---------------|---------|
| Reviewer | **Coder** | AC not met, invariant violated, file too big |
| Reviewer | **Tester** | The test itself contradicts the spec/plan |
| Reviewer | **Architect** | Design doesn't fit the stack (wrong layer, missing contract) |
| Coder | **Architect** | Plan is ambiguous/impossible as written (no guessing) |
| Any stage | **Analyst → User** | A prior decision is wrong/insufficient — §8 ledger `decision-change` entry, then the answer row in §2.4 is edited in place |

Max **2 loops** per stage pair before escalating to the user with the loop history.

## Non-negotiables (every stage, no exceptions)

From the PRD/AGENTS.md — repeated here because each subagent's context is deliberately small:

1. **Local-by-default, no telemetry.** Only outbound model calls go to `OPENAI_BASE_URL`;
   never add telemetry/analytics or unconfigured external endpoints.
2. **Server/client seam.** Client code never imports `better-sqlite3` or the model client;
   all DB/model access lives in `createServerFn`s.
3. **Spec is the contract.** Implement the spec's acceptance criteria — nothing extra,
   nothing skipped. If behavior isn't in a spec, it isn't agreed.
4. **Definition of done** (doc 08 §5): `npm run check` + `npm run test` + `npm run build`
   (i.e. `npm run ci`) pass; new/changed logic covered by tests; docs updated in the same change.
5. **The shared brief is the slice's single source of truth (D9):** one file, append-only
   stage sections, decisions kept as current state, every stage in line with the sections
   above its own. No side channels, no decisions outside §2.2–§2.4 and §8.
