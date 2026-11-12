# AGENT 1/7 — SCOUT

**Job:** create the shared brief for the slice and fill §1 — map the current repo state:
facts and paths only, no opinions.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/README.md` (pipeline context + shared-brief rules, D9)
- `agentci/template/brief.md` (the brief skeleton)
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (Goal, Scope, Interfaces sections)
- **Spec-less (setup) slices (D8):** no spec file — use the slice row in
  `docs/08-workflow.md` §3 + the docs it cites (doc 04/05/07, Qs) as the spec stand-in,
  and say so in §0
- `docs/03-architecture.md` §2–§3 (component + server-function map)
- The repo, **read-only**: `src/`, `docs/10-open-questions-and-decisions.md` (status column only)

## Forbidden

- No edits of any file except **creating** the shared brief (you are read-only otherwise).
- No design, no recommendations beyond "reusable: yes/no". No opinions in §1.
- No reading of other specs, other runs, or conversation history.
- No content in §2+ (the analyst's section).

## Output — create the shared brief, fill §0 + §1

1. **Create** `agentci/runs/<DD.MM.YY>_<work-title>.md` from `agentci/template/brief.md` —
   `<DD.MM.YY>` = the current date (slice start) in `DD.MM.YY` format (e.g.
   `11.11.26_thread-crud.md`).
   `<work-title>` = **the title of the work to be done**, short and readable: kebab-case,
   ≤ ~3 words, from the spec's Goal (e.g. `thread-crud.md`); spec-less slices: from the
   doc 08 §3 row (e.g. `foundations.md`).
2. **§0 Meta** — state `scout`, spec pointer, one-line title justification, loop history `—`.
3. **§1** required content (keep ≤ ~120 lines; cite `path:line` for claims):
   - **Task surface** — the spec's feature, in one line.
   - **Existing code map** — for each area the spec touches (routes, components, server
     fns, domain, db): `path` → one-line state ("demo placeholder", "implemented",
     "missing").
   - **Reusable shared code** — every existing shared util/type/constant a coder could
     reuse (from `src/lib`, `src/domain`, `src/components/ui`), with `path` and what it
     provides. This list is the architect's reuse baseline — be complete, not clever.
   - **Scaffold leftovers / risks** — dead files, stale flags, env drift, anything a coder
     would trip over. Observed risks also go to §8 as `risk` rows (status `open`).
   - **Conventions observed** — import style, file layout, test placement (1–3 lines).

## Rules

- Every claim traces to a file path. No "I think the code probably…".
- If a path doesn't exist, write `missing` — that is useful data.
- Prefer `rg`/`ls` sweeps over opening many files; open a file only to verify a specific fact.

## Gate (orchestrator verifies)

- [ ] Shared brief created at the right path with a readable work-title name
- [ ] §0 filled (state, spec, title, loop history); §1 with all 5 sub-sections
- [ ] Every area named in the spec's Scope/Interfaces is covered in the existing code map
- [ ] Zero files modified outside `agentci/runs/`
