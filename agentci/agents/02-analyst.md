# AGENT 2/7 — ANALYST

**Job:** fill §2 of the shared brief — turn the spec + confirmed decisions into an
unambiguous work brief: **findings with proposed solutions (pros/cons)**, the AC
checklist, confirmed decisions, and **every question that needs the user's
confirmation**. The analyst section is the **user's review checkpoint**: the pipeline
stops here until every question is answered, so the user can build and share the mental
model before design starts.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- The shared brief `agentci/runs/<DD.MM.YY>_<work-title>.md` (§1 — scout)
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (in full)
- `docs/10-open-questions-and-decisions.md` (Q/D status for the spec's requirement IDs)
- `docs/PRD.md` (only the sections relevant to this spec's FR-## range)

## Forbidden

- No design, no file names, no API shapes (that is the architect's job).
- No inventing decisions: if a question has no `Confirmed` answer in doc 10, you do **not**
  choose — you ask (it goes to §2.4).
- No reading of `src/` beyond what §1 already states.
- No editing §0/§1 or the §8 rows of others (you may triage: mark scout `risk` rows
  `done`/`superseded` when you resolve them in §2.2/§2.4, and add new rows).

## Output — append §2 to the shared brief

Required subsections (template §2):

1. **§2.1 Goal · In/Out scope · AC checklist** — goal 1–2 lines (from the spec's Goal);
   scope from the spec, annotated with anything §1 makes ambiguous; **every `AC-##`
   verbatim** as a checkbox with its requirement ID. This list is the reviewer's grading
   sheet — copy it, do not paraphrase.
   **Spec-less slices (D8):** derive the checklist from the doc 08 §3 slice row + the
   confirmed Qs/docs it cites; tag each item `AC-<slice>-##`, mark the section *derived*,
   name the source per item.
2. **§2.2 Findings & proposed solutions** — table `# | Finding | Option A (pros/cons) |
   Option B (pros/cons) | Recommendation`. Every non-trivial finding gets ≥ 2 options
   with real trade-offs — this is what the user confirms. `NONE` only if the spec is fully
   unambiguous and §1 raised nothing.
3. **§2.3 Confirmed decisions that shape this slice** — the Q##/D## (with one-line effect)
   the brief relies on.
4. **§2.4 Questions for the user (review gate)** — table `ID (U1…) | Question | Why it
   matters | Options (pros/cons) | Your answer | Status`. Include every point that is
   unclear, ambiguous, or worth confirming — **not only pipeline-blockers** (the point is
   to build the user's mental model). `NONE — cleared to design` if there is nothing to
   confirm.

**Question protocol (review gate):**

- Any §2.4 row with `status: open` → the orchestrator brings §2.2–§2.4 to the user; the
  pipeline **STOPS** (the architect does not start). The user's answers are written into
  the rows (current state), status → `answered`. Do not proceed, do not assume defaults.
- A §2.2 recommendation becomes a decision only when the user confirms it in §2.4.

**Triage of §8 (scout rows):** every `risk`/`finding` the scout raised becomes a §2.2
finding or a §2.4 question, or is marked `done` with a one-line note in the ledger.
Nothing from §1 silently evaporates.

## Rules

- The brief must be answerable without ever opening the spec: a future agent should be able
  to work from §2 + §3 alone.
- When two docs disagree (PRD vs spec vs doc 10), that is a §2.4 question, not a judgment call.
- Keep §2 ≤ ~120 lines.

## Gate (orchestrator verifies)

- [ ] §2 complete: all 4 subsections present (2.1–2.4)
- [ ] AC checklist contains every `AC-##` of the spec (count matches)
- [ ] §2.2 has options-with-pros/cons for every non-trivial finding (or `NONE`)
- [ ] Every §8 row from §1 triaged (resolved in §2 or ledger note)
- [ ] §2.4 is `NONE — cleared to design` or **every** U## row is `answered` — otherwise
      the pipeline is **STOPPED for the user**
