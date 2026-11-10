# Doc Changelog — slice-0 (documenter, stage 7/7)

Source of truth for "what exists": `review-report.md` (verdict `APPROVED`). Slice 0 is a
**spec-less setup slice** (gap P1): no spec file — the "implemented" marker goes in doc 08 §3
and the changelog line below (per `agents/07-documenter.md`).

## Changelog line (Q41)

- v1 (2026-11-10): implemented slice 0 — foundations (schema, DDD domain + tests, env + tooling);
  AgentCI retro run, review `APPROVED`, remediations R1–R3 + F1–F2 shipped — commit
  `<SHA recorded by the orchestrator in the follow-up docs commit after the slice commit>`.

## Edits

| file | section | change | why |
|------|---------|--------|-----|
| `docs/08-workflow.md` | §3 build order | added "Slice status" note: slice 0 **Implemented** (2026-11-10, AgentCI run link, `APPROVED`); slices 1–5 not started, slice 1 next | gap P1 fallback: spec-less slices are marked done in the build order, not in a spec |
| `docs/10-open-questions-and-decisions.md` | Decision log | appended ADR **D8** (AgentCI conventions for spec-less/retro slices: derived ACs, as-built audit mode, deferral convention, P## fixes by orchestrator); intro line now "D1–D8" | the run made a non-trivial process choice (gaps P1–P7); ADRs are append-only (doc 10 process note) |
| `AGENTS.md` | Current state | marked slice 0 *verified* (AgentCI run, 40 tests, `types.ts` split, explicit barrel, coverage floors enforceable); decisions now D1–D8 | current-state must reflect what shipped (doc 08 §1 principle 5) |
| `AGENTS.md` | Commands | added `npm run test:coverage` | new script (R3/Q36) must be discoverable (documenter: "commands if new") |
| `docs/README.md` | Current state of the repo | annotated the stale pre-slice-0 baseline as history with the current state; status note now: slice 0 Implemented, slice 1 next | the section still described the pre-slice-0 baseline (`todos` table, env drift); the review report's AC-S0-2/S0-3 evidence proves it shipped — drift removed |
| `docs/PRD.md` | — | **no change** | product intent unchanged (documenter: PRD edit only when intent changed) |
| `docs/specs/*` | — | **no change** | no spec file for slice 0 (gap P1); no other spec touched |

Gate self-check: every claim above traces to `review-report.md` §1–§4 or a file verified by
`ls`/`rg` during this stage; `npm run check` re-run by the orchestrator.
