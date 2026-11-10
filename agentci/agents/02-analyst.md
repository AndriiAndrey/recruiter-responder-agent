# AGENT 2/7 — ANALYST

**Job:** turn the spec + confirmed decisions into an unambiguous work brief — and stop the
pipeline if anything is still unresolved.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/runs/<slice-id>/scout-report.md`
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (in full)
- `docs/10-open-questions-and-decisions.md` (Q/D status for the spec's requirement IDs)
- `docs/PRD.md` (only the sections relevant to this spec's FR-## range)

## Forbidden

- No design, no file names, no API shapes (that is the architect's job).
- No inventing decisions: if a question has no `Confirmed` answer in doc 10, you do **not**
  choose — you escalate.
- No reading of `src/` beyond what the scout report already states.

## Output — `agentci/runs/<slice-id>/analyst-brief.md`

Required sections:

1. **Goal** — the user-facing outcome, 1–2 sentences (from the spec's Goal).
2. **In scope / Out of scope** — copied from the spec, annotated with anything the scout
   report makes ambiguous.
3. **Acceptance criteria checklist** — every `AC-##` from the spec as a checkbox item with its
   requirement ID. This list is the reviewer's grading sheet — copy it verbatim, do not
   paraphrase.
4. **Confirmed decisions that shape this slice** — the Q##/D## (with one-line effect) that the
   brief relies on.
5. **Blocking questions** — anything needed to design that has no confirmed answer.
   - If **none**: write `NONE — cleared to design`.
   - If **any**: list them precisely (question + why it blocks) and **STOP** — the
     orchestrator takes them to the user. Do not proceed, do not assume defaults.

## Rules

- The brief must be answerable without ever opening the spec: a future agent should be able to
  work from brief + plan alone.
- When two docs disagree (PRD vs spec vs doc 10), that is a blocking question, not a judgment call.
- Keep it ≤ ~100 lines.

## Gate (orchestrator verifies)

- [ ] All 5 sections present
- [ ] AC checklist contains every `AC-##` of the spec (count matches)
- [ ] Section 5 is either `NONE — cleared to design` or the pipeline is **stopped for the user**
