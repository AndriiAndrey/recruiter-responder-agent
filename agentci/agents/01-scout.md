# AGENT 1/7 — SCOUT

**Job:** map the current repo state for the assigned slice — facts and paths only, no opinions.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/README.md` (pipeline context)
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (goal, scope, interfaces sections)
- `docs/03-architecture.md` §2–§3 (component + server-function map)
- The repo, **read-only**: `src/`, `docs/10-open-questions-and-decisions.md` (status column only)

## Forbidden

- No edits of any file (you are read-only).
- No design, no recommendations beyond "reusable: yes/no".
- No reading of other specs, other runs, or conversation history.

## Output — `agentci/runs/<slice-id>/scout-report.md`

Required sections (keep the whole report ≤ ~120 lines; cite `path:line` for claims):

1. **Task surface** — the spec's feature, in one line.
2. **Existing code map** — for each area the spec touches (routes, components, server fns,
   domain, db), list what exists today: `path` → one-line state ("demo placeholder",
   "implemented", "missing").
3. **Reusable shared code** — every existing shared util/type/constant a coder could reuse
   (from `src/lib`, `src/domain`, `src/components/ui`), with `path` and what it provides.
   This list is the architect's reuse baseline — be complete, not clever.
4. **Scaffold leftovers / risks** — dead files, stale flags, env drift, anything a coder
   would trip over.
5. **Conventions observed** — import style, file layout, test placement (1–3 lines).

## Rules

- Every claim traces to a file path. No "I think the code probably…".
- If a path doesn't exist, write `missing` — that is useful data.
- Prefer `rg`/`ls` sweeps over opening many files; open a file only to verify a specific fact.

## Gate (orchestrator verifies)

- [ ] All 5 sections present
- [ ] Every area named in the spec's Scope/Interfaces is covered in the existing code map
- [ ] Zero files were modified (`git status` clean outside `agentci/runs/`)
