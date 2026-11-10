# Feature Specs (Spec-Driven Development)

**Status:** **Approved** (all open questions resolved — every Q in doc 10 is `Confirmed`; specs may
be implemented per the build order in doc 08 §3)
**Role:** These are the **executable contracts** for implementation. Each spec turns a group of
functional requirements (doc 01) into implementable, testable detail. See
[`../08-workflow.md`](../08-workflow.md) for the lifecycle (Draft → In Review → Approved →
Implemented).

## Specs in this folder

| Spec | Covers | Requirements | Status |
|------|--------|--------------|--------|
| [FR-01 — Thread & chat management](./FR-01-thread-management.md) | workspace, create, select, lifecycle | FR-01…04, FR-15, FR-16 | Approved |
| [FR-02 — Bi-directional message logging](./FR-02-message-logging.md) | composer, commit, ordering, immutability | FR-05…07 | Approved |
| [FR-03 — On-demand AI answer generation](./FR-03-ai-answer-generation.md) | CV+thread → model → draft → commit | FR-08…12 | Approved |
| [FR-04 — CV context management](./FR-04-context-management.md) | `data/context.md` single source of truth | FR-13…14 | Approved |

## How a spec is used

1. **Read** the spec + its requirements + the linked open questions (doc 10).
2. If any **blocking** question is open, the spec stays *Draft* — resolve it first.
3. **Implement** exactly the spec (acceptance criteria are the definition of done).
4. **Test** every acceptance criterion (doc 09) — a criterion with no test is not done.
5. Mark the spec **Implemented** with a link to the PR/commit; update doc 10 decisions if any.

## Spec template (copy for new features)

```markdown
# SPEC-## — <Feature name>

**Status:** Draft | In Review | Approved | Implemented
**Requirements:** FR-## …
**Blocking questions:** Q## …   (must be Confirmed to approve)
**Depends on:** SPEC-## …

## Goal
One or two sentences: the user-facing outcome.

## User stories
- As a …, I can …, so that ….

## Scope
### In
- …
### Out (explicit)
- …

## Data
- Tables/fields touched (ref doc 04), invariants (ref doc 05).

## Interfaces
- Server functions (SF-##) with input/output (zod).
- UI surfaces and their states.

## Behavior (acceptance criteria)
Numbered, testable, each tagged with its requirement ID:
- AC-1 (FR-##): …
- AC-2 (FR-##): …

## Edge cases & error handling
- …

## AI / privacy constraints affected
- Which PRD constraints (1–6) / NFRs this touches and how they're enforced.

## Test obligations (map to doc 09)
- Unit: …
- Integration: …
- Guardrail: …

## Changelog
- v1 (date): initial draft.
```

## Conventions

- **IDs are stable.** Never renumber; deprecate instead if a spec is retired.
- **One spec per vertical slice** (UI + server + DB + AI for that capability).
- **Reference by ID** everywhere (code comments, test names, commits, PRs).
- **Keep in sync:** if the spec changes, bump the Changelog and, if product intent changed, the
  PRD too (doc 08 §6).
