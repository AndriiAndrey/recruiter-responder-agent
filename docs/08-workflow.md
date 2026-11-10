# 08 — Workflow (Spec-Driven Development Process)

**Status:** Draft
**Purpose:** Define *how* we develop: the spec → implement → verify loop, branching, review, and
definition of done. This is the SDD half of the methodology.

---

## 1. Principles

1. **Specs first, code second.** A feature is specced (in [`specs/`](./specs/README.md)) and
   approved **before** implementation starts.
2. **Specs are the contract.** Acceptance criteria in a spec are the definition of "works."
   If behavior isn't in a spec, it's not agreed.
3. **Tests prove the spec.** Every acceptance criterion maps to at least one test
   (doc 09). "Done" = spec criteria met **and** covered by passing tests.
4. **Small, vertical slices.** Ship a feature end-to-end (UI + server + DB + AI) in one reviewable
   increment, not layer-wide horizontal slices.
5. **Keep docs honest.** When a requirement changes, update the PRD/spec **in the same change** as
   the code (AGENTS.md: "when requirements change, update the PRD too").

---

## 2. The lifecycle

```
        ┌─────────────┐   open questions   ┌──────────────┐
        │  DRAFT      │ ──────────────────► │  IN REVIEW   │
        │  (spec)     │                     │  (confirm Qs)│
        └──────┬──────┘                     └──────┬───────┘
               │ (all blocking Qs answered)        │ (approved)
               ▼                                   ▼
        ┌─────────────┐   implement + tests   ┌──────────────┐
        │  APPROVED   │ ─────────────────────► │ IMPLEMENTED  │
        └─────────────┘                        └──────────────┘
```

- **Draft:** spec written; open questions flagged `Q##`.
- **In Review:** spec is with the owner; blocking questions resolved in doc 10.
- **Approved:** all blocking questions answered, acceptance criteria agreed. *Now* we may code.
- **Implemented:** code + tests merged; spec marked implemented with a link to the PR/commit.

> **Gate:** no code for a feature starts until its spec is **Approved**. Non-blocking questions can
> be resolved during implementation but must be recorded.

---

## 3. Proposed build order (dependencies)

Ordered so each slice is runnable and testable, and later slices reuse earlier primitives:

| Order | Slice | Spec | Depends on |
|-------|-------|------|-----------|
| 0 | **Foundations**: replace `todos` schema with `threads`/`messages`, set up `.env`, DDD layout, first migration, `data/context.md` placeholder | (setup) | doc 04/05/07, Q18–Q21 |
| 1 | **Thread CRUD**: create + list + select threads, app shell, routing | SPEC-01 | slice 0 |
| 2 | **Message logging**: bi-directional composer, commit, chronological render, append-only | SPEC-02 | slice 1 |
| 3 | **AI generation**: CV loader, prompt assembler, model client, Generate button, draft review, commit/discard, errors | SPEC-03 | slices 2 + `context.md` |
| 4 | **Context management polish**: CV status indicator, empty states, validation | SPEC-04 | slice 3 |
| 5 | **Chat soft-delete** (in SPEC-01) | SPEC-01 (ext) | slice 1 |

> Slices 3 and 4 can partly parallelize. Full-text search is **out of v1** (Q7 confirmed) — slice 5
> is chat soft-delete only.

---

## 4. Branching & commit conventions (Q40 confirmed)

**Solo, trunk-based (Q39 confirmed:** no multi-reviewer gate; "review" = self-check against the
spec's acceptance criteria + gates):

- Develop on short-lived feature branches off `main`: `feat/spec-01-threads`, `fix/...`.
- Keep PRs small (one spec slice or a focused fix).
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, with a
  reference to the spec/requirement, e.g. `feat(threads): add create dialog (SPEC-01)`.
- Every commit that changes behavior references the spec/requirement ID.

---

## 5. Definition of Done (per feature / per PR)

A feature is **done** when **all** of the following hold (mirrors AGENTS.md):

- [ ] Its spec's **acceptance criteria are met**.
- [ ] `npm run check` passes (Biome lint + format).
- [ ] `npm run test` passes, with **new/changed logic covered** by tests (doc 09).
- [ ] `npm run build` passes.
- [ ] **No new unconfigured external calls / no telemetry** (verify: the only outbound model calls
      go to `OPENAI_BASE_URL`; no new SDK with phone-home/analytics). The guardrail (D3) enforces
      this automatically (prompt-safety + no-telemetry).
- [ ] If AI was touched, PRD constraints **2–4** still hold (anchor, explicit-action, staged review).
- [ ] Spec status updated to `Implemented` with a link to the PR/commit.
- [ ] Docs (PRD/spec/NFR) updated if any requirement changed.

---

## 6. Change management (requirements evolve)

1. **Start from the spec/PRD.** Identify which requirement(s) change.
2. **Update the spec first** (and PRD if product intent changed). Bump the spec's revision and add
   a changelog line (each spec has a "Changelog" section). (Q41 confirmed: per-spec revision +
   changelog, PRD updated in the same change.)
3. **Resolve any new open questions** in doc 10.
4. **Then** implement code + tests to match the updated spec.
5. **Record** a decision (ADR) in doc 10 if it was a non-trivial choice.

> Never silently change behavior. The spec is the contract; code following a stale spec is a bug.

---

## 7. Verification gates (automated)

These run locally as a single **`npm run ci`** script (Q45 confirmed): `npm run check` +
`npm run test` + `npm run build`. A hosted CI provider is **deferred** (Q27: no multi-platform CI
for now).

| Gate | Command | Catches |
|------|---------|---------|
| Lint/format | `npm run check` | style, imports, Biome rules |
| Type | (part of build) | TS `strict` violations |
| Unit (MVP; Q37/Q38) | `npm run test` | spec acceptance criteria |
| Prompt-safety + no-telemetry guardrail | (unit test, D3) | unconfigured external calls / prompt injection / analytics SDK |
| Build | `npm run build` | production build + route regen |

---

## 8. Agent (AI-assisted) workflow note

Because this repo is developed with coding agents (AGENTS.md), the spec set is written to be
**machine-actionable**: stable IDs, explicit acceptance criteria, and clear "do not" rules. Agents
should:
- Read the relevant spec + doc 10 before implementing.
- Implement exactly the spec; if blocked by an open question, stop and surface it (don't assume).
- Add tests that assert the acceptance criteria by ID.
- Never introduce remote calls or remote keys (hard constraint).
