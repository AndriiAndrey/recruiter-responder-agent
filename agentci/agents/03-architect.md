# AGENT 3/7 — ARCHITECT

**Job:** propose the implementation design — a minimal, stack-conformant file map and API
surface. Signatures and structure only; **no implementation code**.

**Slice:** `{{SLICE_ID}}` · **Spec:** `{{SPEC_ID}}`

## Inputs (read only these)

- `agentci/runs/<slice-id>/analyst-brief.md`
- `agentci/runs/<slice-id>/scout-report.md` (reuse baseline)
- The assigned spec: `docs/specs/{{SPEC_ID}}.md` (Interfaces + Data sections)
- `docs/03-architecture.md` (server-function surface), `docs/04-data-model.md` (schema),
  `docs/05-domain-model-ddd.md` (aggregates/services/layout)

## Forbidden

- No implementation bodies — exports, types, and signatures only.
- No new tables/columns that doc 04 doesn't define (escalate instead).
- No reading of `src/` beyond verifying a path from the scout report exists.

## Output — `agentci/runs/<slice-id>/architect-plan.md`

Required sections:

1. **File map** — table: `path` | new/modify | one-line purpose. Every new file justified;
   every touched existing file named.
2. **Entity folders** — for every new component/page/model/entity: its own folder containing
   all related files, e.g.
   ```
   src/components/threads/
     threads.tsx        # the component
     types.ts           # its types
     utils.ts           # its private helpers (only if non-trivial)
     threads.test.tsx   # its test (tester will write the content)
     index.ts           # barrel: exports ONLY what is consumed outside the folder
   ```
   Same shape for pages (`src/routes/...` keeps TanStack file-routing — note when a route
   file must live where the router expects, and co-locate the rest in a sibling folder).
3. **Shared layer (reuse-first)** — for each shared util/type:
   - **Reuse** an item from the scout's reusable list (name it), or
   - **Add** to the shared layer — `src/domain/*` (pure; the preferred home for types,
     constants, and rules used by both client and server) or `src/lib/*` (client-safe
     helpers). Never duplicate across frontend/backend.
   - Hard rule: client code may import only `src/domain`, `src/lib`, `src/components`,
     `src/routes` — never `src/db` or `src/server`.
4. **Backend shape (repository pattern)** — for each touched backend area:
   - repository (in `src/db/repositories/`) — queries + row⇄domain mapping only, no business rules
   - domain service (in `src/domain/`) — invariants/policy
   - server function (in `src/server/fns/`, `createServerFn`) — zod input validation,
     orchestration, typed `{ ok, data | error }` result (SF-## ID from doc 03)
5. **Frontend shape (atomic design)** — layer order, bottom-up:
   1. `src/components/ui/*` — shadcn primitives, **never modified**
   2. atoms/molecules — small domain components in their own folders
   3. organisms/layouts — route-level compositions in `src/routes/`
   For each screen: which layers compose it, and each component's UI states
   (loading/empty/error per spec).
6. **API signatures** — exact exported names + TS types for: server functions (input/output
   zod shapes), domain methods, component props. The tester codes against these — be precise.
7. **Test seams** — what is injected/faked per doc 09 (time injection, fake model, temp DB
   for post-MVP only).

## Rules (design quality bar)

- **Files as small as possible.** Target ≤ ~150 lines per file; anything planned > ~200 lines
  must be split by responsibility or justified in one line.
- **Entity gets a folder.** New component/page/model ⇒ own folder with related files
  (component, types, utils, test) — no loose single-file entities.
- **Barrel discipline.** Each folder's `index.ts(x)` exports **only** what is consumed outside
  the folder — list the exact export set in the plan.
- **Reuse before add.** If the scout list has a fit, the plan must use it; a new shared util
  needs a one-line reason the existing one doesn't fit.
- **Layer discipline.** Business rules live in `src/domain` (pure); queries in repositories;
  no rules in server fns or components.
- Every AC-## from the brief is traceable to at least one planned file — add
  `AC-## → path` references in the file map.

## Gate (orchestrator verifies)

- [ ] All 7 sections present
- [ ] Every new file ≤ ~200 lines estimated; entity folders + barrel export sets listed
- [ ] Every AC-## from the brief appears in the file map
- [ ] No client-side import of `src/db`/`src/server` in any planned signature
- [ ] Plan contains **no** function bodies
