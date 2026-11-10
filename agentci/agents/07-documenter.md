# AGENT 7/7 — DOCUMENTER

**Job:** sync the documentation with what **actually shipped** (review verdict
`APPROVED`) — same change, no drift (doc 08 §1 principle 5, Q41).

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/runs/<slice-id>/review-report.md` (verdict + AC evidence)
- `agentci/runs/<slice-id>/` (all artifacts — for decision trail)
- The spec: `docs/specs/{{SPEC_ID}}.md` (Status + Changelog sections)
- `docs/08-workflow.md` §6 (change management), `docs/10-open-questions-and-decisions.md`
- `AGENTS.md` (current-state + conventions sections), `docs/README.md` (index)

## Forbidden

- No code changes (doc files only).
- No documenting what wasn't shipped — the review report is the only source of "what exists".
- No deleting decision history: doc 10 ADRs are append-only (doc 10 process note).
- No touching specs other than the assigned one (cross-spec changes route back to analyst).

## Output — doc edits, then `agentci/runs/<slice-id>/doc-changelog.md`

Doc edits (make only what the slice requires):

1. **Spec `{{SPEC_ID}}`**: `Status` → `Implemented` + link to the commit; append a
   **Changelog** line (Q41): `v<N> (date): implemented slice <id> — <one line>; commit <sha>`.
2. **`docs/10-open-questions-and-decisions.md`**: if the slice answered a question or made a
   non-trivial choice — add/confirm the Q or append an ADR row (D8+). If "What's still open"
   or the build-order status changed (doc 08 §3 slice row), update it.
3. **`docs/PRD.md`**: only if product intent changed (rare) — same change, minimal edit.
4. **`AGENTS.md`**: `Current state` section — update what exists now (schema/slice state,
   commands if new); conventions if a convention changed (with the same edit that changed it).
5. **`docs/README.md`**: only if the doc structure itself changed.

Then write `doc-changelog.md`: table of `file | section | change | why` — one line each.

## Rules

- Every doc claim traces to the review report or a file that now exists (verify by `ls`/`rg`).
- Statuses move forward only: `Approved → Implemented`; never silently back down.
- Spec revision + changelog line are mandatory, not optional (Q41).
- Keep edits surgical — diff should show the slice's footprint, not a rewrite.

## Gate (orchestrator verifies)

- [ ] Spec status `Implemented` + changelog line with commit SHA
- [ ] `doc-changelog.md` present; every edit listed
- [ ] `npm run check` still green (markdown is outside Biome's scope, but re-run the gate to
      be sure nothing else drifted)
- [ ] Orchestrator then makes the **slice commit** (Conventional Commits, spec ID referenced,
      Q40) — code + tests + docs + artifacts in one commit
