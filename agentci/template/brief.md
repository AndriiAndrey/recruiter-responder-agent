# Slice Brief — {{SLICE_ID}} · {{SPEC_ID}}

> **One file, all seven stages.** Each stage appends its numbered section and nothing else.
> Stage sections are **append-only history** — never rewritten or deleted.
> **Decisions keep their current state**: when an answer changes, the row in §2.4 (and the
> ledger status) is edited in place, and §8 records who changed what, when, and why — no
> trail of old states is kept.
> A contradiction with a prior decision is never resolved inside a section — it becomes a
> §8 ledger entry and routes back (see the stage instruction files).

## 0. Meta

- **State:** `scout` → `analysis (awaiting user)` → `design` → `tests (RED)` →
  `implementation (GREEN)` → `review` → `shipped` — orchestrator updates at each gate
- **Spec:** `docs/specs/{{SPEC_ID}}.md` · spec-less slice: doc 08 §3 row + the docs it cites
- **Title:** <one line — why the file is named this, from the spec's Goal>
- **Loop history:** — (one line per loop: `date · stage → routed-to · reason`)

## 1. SCOUT — what exists

<scout: task surface · existing code map (path → state) · reusable shared code ·
scaffold leftovers/risks (risks also land in §8) · conventions observed — facts only>

## 2. ANALYST — what to build

### 2.1 Goal · In/Out scope · AC checklist

<goal 1–2 lines; scope from the spec annotated with scout ambiguities; every `AC-##`
verbatim as a checkbox (the reviewer's grading sheet). Spec-less slice (D8): derived
`AC-<slice>-##`, marked *derived* with source per item>

### 2.2 Findings & proposed solutions

| # | Finding | Option A (pros / cons) | Option B (pros / cons) | Recommendation |
|---|---------|------------------------|------------------------|----------------|

<every non-trivial finding with ≥ 2 options and real trade-offs — this is what the user
confirms. `NONE` only if the spec is fully unambiguous. A recommendation becomes a
decision only when the user confirms it in §2.4>

### 2.3 Confirmed decisions that shape this slice

| Decision (Q##/D##) | One-line effect on this slice |
|--------------------|-------------------------------|

### 2.4 Questions for the user (review gate)

| ID | Question | Why it matters | Options (pros / cons) | Your answer | Status |
|----|----------|----------------|-----------------------|-------------|--------|
| U1 | | | | | `open` |

<`NONE — cleared to design` if there is nothing to confirm. The pipeline is **STOPPED**
while any row is `open` — the orchestrator brings §2.4 to the user; answers are written
into the rows (current state), status → `answered`.>

## 3. ARCHITECT — how

### 3.0 Decision compliance

| Decision (Q##/D##/U##) | How this design honours it |
|------------------------|----------------------------|

<3.1 file map (every AC traceable to a planned file) · 3.2 entity folders · 3.3 shared
layer (reuse-first) · 3.4 backend shape · 3.5 frontend shape · 3.6 API signatures ·
3.7 test seams — signatures only, no implementation code>

## 4. TESTER — tests (RED)

<decision compliance line (incl. each behaviour-changing U## → ≥ 1 test or justification)
· AC → test map (1:1 minimum; `deferred → <slice>` per D8) · kinds · guardrail obligations
· expected RED state · new findings → §8>

## 5. CODER — implementation (GREEN)

<decision compliance line · work summary: files vs plan map, deviations (none / justified)
· DoD: check / test / build results · new findings → §8>

## 6. REVIEWER — verification

<AC verdicts (pass|fail + evidence) · invariant checklist (incl. decision compliance) ·
findings table · DoD run · verdict `APPROVED` / `REJECTED`>

## 7. DOCUMENTER — shipped

<doc edits table (file | section | change | why) · changelog line (Q41) · commit SHA>

## 8. Open items ledger (rolling)

| # | Raised by | Item | Type (`question` / `finding` / `risk` / `decision-change`) | Status (`open` / `answered` / `deferred → slice` / `done` / `superseded → #`) | Resolved by |
|---|-----------|------|-------------------------------------------------------------|----------------------------------------------------------------------------------|-------------|
