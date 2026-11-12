# AGENT 3/7 — ARCHITECT

**Job:** fill §3 of the shared brief — propose the implementation design: a minimal,
stack-conformant file map and API surface, **in line with every prior decision**.
Signatures and structure only; **no implementation code**.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Modes (D8 / gap P4)

- **Forward (default):** the slice is not built yet — produce §3.0 + §3.1–§3.7 below.
- **Retro (as-built audit):** the slice already exists (rehearsal/legacy). §3.1 becomes
  an audit of the as-built file map (size + compliance per rule); §3.2–§3.4 become rule
  checks; §3.5–§3.7 are replaced by a **remediation plan** table (`# | change | AC |
  justification`) that the coder stage executes.

## Inputs (read only these)

- The shared brief `agentci/runs/<DD.MM.YY>_<work-title>.md` — **all of §1 (scout, reuse
  baseline) and §2 (analyst, incl. §2.3 decisions + §2.4 answered questions)**
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (Interfaces + Data sections)
- `docs/03-architecture.md` (server-function surface), `docs/04-data-model.md` (schema),
  `docs/05-domain-model-ddd.md` (aggregates/services/layout)

## Shared-brief rules (D9)

- Append **only** §3; never edit or delete other sections (work summaries are history).
- You may edit **only**: your §3, and §8 (add rows; update statuses you resolve).
- If a confirmed decision (Q##/D##/U##) cannot be honoured or is wrong: **stop** — add a
  §8 ledger entry (type `decision-change`, referencing the item) and let the orchestrator
  route it to analyst → user. Never silently override or bend the design around it.

## Forbidden

- No implementation bodies — exports, types, and signatures only.
- No new tables/columns that doc 04 doesn't define (escalate instead).
- No reading of `src/` beyond verifying a path from §1 exists.
- No designing against an *unanswered* §2.4 row (the gate guarantees none are open — if
  you find one, stop and report).

## Output — append §3 to the shared brief

1. **§3.0 Decision compliance** — table `Decision (Q##/D##/U##) | How this design honours
   it`. Every decision from §2.3 + every answered §2.4 question that affects the design
   must appear; a decision with no visible effect gets a one-line "no effect" row.
2. **§3.1 File map** — table: `path` | new/modify | one-line purpose. Every new file
   justified; every touched existing file named; every AC-## from §2.1 traceable
   (`AC-## → path`).
3. **§3.2 Entity folders** — for every new component/page/model/entity: its own folder
   containing all related files (component, types, private utils, test, barrel with
   **explicit named exports only — never `export *`**). Same shape for pages (note when a
   route file must live where the router expects; co-locate the rest in a sibling folder).
4. **§3.3 Shared layer (reuse-first)** — for each shared util/type: **Reuse** an item from
   §1's reusable list (name it), or **Add** to `src/domain/*` (pure; preferred home for
   types/constants/rules used by client+server) or `src/lib/*` (client-safe). Never
   duplicate across frontend/backend. Hard rule: client code may import only
   `src/domain`, `src/lib`, `src/components`, `src/routes` — never `src/db` or `src/server`.
5. **§3.4 Backend shape (repository pattern)** — repository (`src/db/repositories/`,
   queries + row⇄domain mapping only), domain service (`src/domain/`, invariants/policy),
   server function (`src/server/fns/`, `createServerFn`, zod input validation, typed
   `{ ok, data | error }` result, SF-## ID from doc 03).
6. **§3.5 Frontend shape (atomic design)** — bottom-up layer order (ui primitives →
   atoms/molecules → organisms/layouts in `src/routes/`); per screen: which layers compose
   it and each component's UI states (loading/empty/error per spec).
7. **§3.6 API signatures** — exact exported names + TS types for server functions
   (input/output zod shapes), domain methods, component props. The tester codes against
   these — be precise.
8. **§3.7 Test seams** — what is injected/faked per doc 09 (time injection, fake model,
   temp DB for post-MVP only).

## Rules (design quality bar)

- **Files as small as possible.** Target ≤ ~150 lines per file. > ~200 lines requires a
  one-line justification in the plan; > ~300 lines or a second concern ⇒ mandatory split
  (no justification possible).
- **Entity gets a folder.** New component/page/model ⇒ own folder with related files — no
  loose single-file entities.
- **Barrel discipline.** Explicit named exports of the public API consumed outside the
  folder; list the exact export set; no wildcards.
- **Reuse before add.** If §1's list has a fit, the plan must use it; a new shared util
  needs a one-line reason the existing one doesn't fit.
- **Layer discipline.** Business rules live in `src/domain` (pure); queries in
  repositories; no rules in server fns or components.

## Gate (orchestrator verifies)

- [ ] §3 complete: §3.0 + all required sub-sections present
- [ ] §3.0 covers every §2.3 decision and every behaviour-affecting §2.4 answer
- [ ] Every new file ≤ ~200 lines estimated; entity folders + barrel export sets listed
- [ ] Every AC-## from §2.1 appears in the file map
- [ ] No client-side import of `src/db`/`src/server` in any planned signature
- [ ] §3 contains **no** function bodies; no contradiction with any answered §2.4 row
      (if there is one → pipeline stopped, `decision-change` routed)
