# AGENT 7/7 — DOCUMENTER

**Job:** fill §7 of the shared brief and sync the documentation with what **actually
shipped** (review verdict `APPROVED`) — same change, no drift (doc 08 §1 principle 5, Q41).

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- The shared brief `agentci/runs/<DD.MM.YY>_<work-title>.md` — **all of §1–§6** (verdict +
  AC evidence + full decision trail for the changelog)
- The spec: `docs/specs/{{SPEC_ID}}.md` (Status + Changelog sections). **Spec-less (setup)
  slices (D8):** no spec file — doc 08 §3 (slice row) + the brief are the record source
  instead
- `docs/08-workflow.md` §6 (change management), `docs/10-open-questions-and-decisions.md`
- `AGENTS.md` (current-state + conventions sections), `docs/README.md` (index)

## Shared-brief rules (D9)

- Append **only** §7; never edit or delete other sections, never change code.
- You may edit **only**: your §7, the doc files listed below, and §8 (mark items `done`).

## Forbidden

- No code changes (doc files only).
- No documenting what wasn't shipped — §6 (the review section) is the only source of
  "what exists".
- No deleting decision history: doc 10 ADRs are append-only (doc 10 process note).
- No touching specs other than the assigned one (cross-spec changes route back to analyst).

## Output — doc edits, then append §7 to the shared brief

Doc edits (make only what the slice requires):

1. **Spec `{{SPEC_ID}}`**: `Status` → `Implemented` + link to the commit; append a
   **Changelog** line (Q41): `v<N> (date): implemented slice <id> — <one line>; commit <sha>`.
   **Spec-less slices (D8):** no spec file — mark the slice done in the doc 08 §3 build
   order instead, and carry the changelog line in §7.
2. **`docs/10-open-questions-and-decisions.md`**: if the slice answered a question or made
   a non-trivial choice — add/confirm the Q or append an ADR row (D8+). If "What's still
   open" or the build-order status changed (doc 08 §3 slice row), update it.
3. **`docs/PRD.md`**: only if product intent changed (rare) — same change, minimal edit.
4. **`AGENTS.md`**: `Current state` section — update what exists now (schema/slice state,
   commands if new); conventions if a convention changed (with the same edit that changed it).
5. **`docs/README.md`**: only if the doc structure itself changed.

**§7 of the shared brief** (was `doc-changelog.md`):
- **Changelog line** (Q41) — the exact line added (or carried, for spec-less slices).
- **Doc edits table** — `file | section | change | why`, one line each, incl. any doc-10
  ADR row added.
- **Commit SHA** — filled in by the orchestrator after the slice commit.

## Rules

- Every doc claim traces to §6 or a file that now exists (verify by `ls`/`rg`).
- Statuses move forward only: `Approved → Implemented`; never silently back down.
- Spec revision + changelog line are mandatory, not optional (Q41).
- Keep edits surgical — diff should show the slice's footprint, not a rewrite.

## Gate (orchestrator verifies)

- [ ] Spec status `Implemented` + changelog line with commit SHA (spec-less: doc 08 §3
      marked done + changelog line in §7)
- [ ] §7 present in the brief; every doc edit listed in its table
- [ ] `npm run check` still green (markdown is outside Biome's scope, but re-run the gate
      to be sure nothing else drifted)
- [ ] Orchestrator then makes the **slice commit** (Conventional Commits, spec ID
      referenced, Q40) — code + tests + docs + the brief in one commit
