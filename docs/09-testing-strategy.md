# 09 — Testing Strategy

**Status:** Draft
**Framework:** Vitest + jsdom (already configured in `vitest.config.ts`). Tests live next to code
as `src/**/*.{test,spec}.{ts,tsx}`.
**Goal:** Every spec acceptance criterion is provable by a test. AI behavior is testable **without**
a real model.

> **MVP scope (Q37/Q38 confirmed):** the MVP test suite is **unit tests only** — pure domain logic
> plus server/AI services tested with an injected **fake model** and stubbed I/O. The **integration**
> layer (server fn + real SQLite) and the **mock OpenAI-compatible server** test are **deferred to
> post-MVP**; they remain part of the plan below and are marked *(post-MVP)*. **E2E (Playwright)** is
> **not planned for v1**.

---

## 1. Testing pyramid (for this app)

```
            ▲   E2E (few)            — not planned for v1 (Q37)
          ▲ ▲   Integration (some)   — post-MVP (Q38): server fn → SQLite + mock AI
        ▲ ▲ ▲   Unit (many)          — the MVP suite: pure domain + services w/ fakes
```

The value of this architecture is that the **domain is pure** (doc 05 §8): `domain/` has no DB,
React, or model imports, so the most important invariants are cheap, fast, deterministic unit
tests. We invest most there.

---

## 2. What to test (by layer)

### 2.1 Unit — `domain/` (pure, no mocks needed)
The heart of the suite. Covers the invariants and policies:

| Target | Example assertions (by requirement ID) |
|--------|----------------------------------------|
| `Thread.create` | enforces non-empty name+company (**I1**); rejects empties |
| `Thread.addMessage` | appends in order (**I2**); rejects empty body (**I3**); rejects bad role |
| `Thread.messages()` | returns chronological order, ties broken by id (**I2**, NFR-04.3) |
| Immutability (Model A) | no mutation path exists; `addMessage` is the only write (**I4**) |
| `MessageRole` | closed set; mapping to display (**Q6**) |
| `PromptAssembler` | output contains **only** CV + thread messages (anchor, **NFR**/PRD-2); CV wrapped as data; message sender labels + order preserved; overflow truncation keeps CV + most-recent (Q13) |
| `MessagePolicy` | length cap enforced (NFR-10.2); whitespace rejection |
| `CvContext` | empty/missing detection (Q22) |
| `GenerationService` (with a fake model) | explicit-action only (no auto path); duplicate in-flight guarded (NFR-04.4); error mapping to typed kinds (doc 06 §7) |

### 2.2 Unit — `server/ai/model-client.ts`
- Reads config from `OPENAI_*` env; builds a request against `OPENAI_BASE_URL`.
- **No other endpoint:** asserts the client only ever calls `OPENAI_BASE_URL` (privacy, NFR-01).
- Maps provider errors to the typed `GenerationResult.error.kind`s.

### 2.3 Unit — `server/context/cv-context.service.ts`
- Reads `data/context.md`; reports `{exists, nonEmpty, size}`.
- Missing file → `context_missing`; empty file → `context_missing`.

### 2.4 Integration — server functions + real SQLite (in-memory / temp file) *(post-MVP, Q38)*
Use a **temporary** SQLite DB (e.g., `:memory:` or a temp file) per test, with the real Drizzle
repositories. No mock DB.

| Target | Assertions |
|--------|-----------|
| `createThread` → `listThreads` | thread appears with name+company (SF-01/02, FR-01/02) |
| `getThread` | returns thread + messages in order (SF-03, FR-03) |
| `addMessage` | appends one row, correct role/timestamp; empty body rejected (SF-04, FR-06) |
| `addMessage` ordering | N messages → returned in commit order, ties by id (NFR-04.3) |
| `deleteThread` cascade (if Q4) | removing a thread removes its messages |
| `generateAnswer` (mock model) | returns a draft built from CV + thread; `context_missing` when no CV (SF-06, FR-09) |

### 2.5 Guardrail test (D3) — **critical**
A test that **fails** if the app's privacy/safety guarantees break:
- **Prompt safety:** assert `PromptAssembler` wraps CV + message text in data delimiters and the
  system prompt treats it as data (recruiter/CV text cannot override instructions).
- **No telemetry / no unexpected endpoints:** the only outbound model calls go to
  `OPENAI_BASE_URL`; no imported SDK phones home / analytics; no hardcoded unexpected external
  endpoint.

This directly enforces NFR-01/02 and the "no unconfigured external calls / no telemetry" definition
of done. (A remote `OPENAI_BASE_URL` is allowed — the guard is about *unconfigured* calls and
prompt injection, not about blocking all non-localhost hosts.)

### 2.6 E2E *(not planned for v1 — Q37 confirmed)*

> **Q37 (confirmed):** no browser E2E (Playwright) for the MVP — unit tests only. If added later,
> the highest-value journey is: create thread → add 2 messages → click Generate (mock model) →
> draft appears → commit → message appears.

---

## 3. How we test AI **without** a real model

We never require a live model to run the suite. Strategy:

1. **Fake model at the `model-client` seam.** `GenerationService` depends on an injectable
   "chat" function. In tests, inject a **fake** that returns a canned draft (or streams tokens).
   This tests orchestration, prompt assembly, error mapping, and the explicit-action guard
   deterministically — no model, no network.
2. **Deferred (post-MVP, Q38): a local mock OpenAI-compatible server** for an integration test that
   exercises the real `@tanstack/ai-openai` request path (a tiny in-test HTTP server on a loopback
   port returning a canned `chat/completions` response). This proves the client wiring without a
   model. **Out of scope for the MVP** — the fake-model unit tests above cover orchestration, prompt
   assembly, and error mapping.
3. **Prompt-assembly tests are pure** (no model): assert the exact prompt structure, anchoring,
   ordering, and overflow behavior. These are the strongest guarantee against hallucination and
   context leakage.

> **We do NOT** assert specific model *output text* (it varies by model). We assert *structure,
> anchoring, and control flow*, and that the draft is **not** auto-committed.

---

## 4. Mapping acceptance criteria → tests

Each spec lists its acceptance criteria; each criterion gets a test named after its ID.
Convention:

```ts
// e.g. src/domain/generation/prompt-assembler.test.ts
describe("PromptAssembler (SPEC-03 / PRD constraint 2)", () => {
  it("FR-09: builds the prompt from ONLY the CV and the thread messages", () => { ... });
  it("FR-09: treats CV and messages as data (delimiters + labels)", () => { ... });
  it("Q13: on overflow, keeps the full CV and the most-recent messages", () => { ... });
});
```

Rule: **a spec criterion with no test is not done.** The test name references the requirement ID so
the link is greppable.

---

## 5. Coverage & quality bar (Q36 confirmed)

- **`domain/` ≥ 90%** (the pure, high-value logic).
- **`server/` ≥ 80%** (services + AI wrapper + context service).
- Repositories/integration: covered by the post-MVP integration suite (not a % gate).
- Overall: no regressions; report via `vitest --coverage` (add `@vitest/coverage-v8`).

Coverage is a *floor*, not the goal — the goal is that every acceptance criterion is proven.

Other bars:
- `npm run test` green on every PR (definition of done, doc 08 §5).
- No flaky tests: time is injected (no real `Date.now()` in domain logic), model is faked.
- Deterministic: same inputs → same assertions; the only non-deterministic path (real model) is
  excluded from automated assertions.

---

## 6. Test data & fixtures

- **In-memory/temp SQLite** per test (no shared DB file; never the real `dev.db`).
- **CV fixture:** a small, fixed `context.md`-like string in a fixtures file (a fake CV — clearly
  marked, not real data).
- **Thread fixture:** a few recruiters/companies and a short ordered conversation.
- Time is **injected** (a `now()` parameter or a test clock) so ordering assertions are stable.

---

## 7. Testing the non-negotiables (explicit tests for PRD constraints)

| Constraint | Dedicated test(s) |
|------------|-------------------|
| 1 — local by default, no telemetry | Guardrail test (D3): prompt-safety + no-telemetry/no-unexpected-endpoint |
| 2 — anchor to CV + thread only | `PromptAssembler` tests (only those inputs; nothing else) |
| 3 — explicit action only | `GenerationService` test: no generation triggered by `addMessage`/route; only via `generate()` |
| 4 — staged review | test: a generated draft is **not** persisted until `commitMessage`; discard persists nothing |
| 5 — ambiguity detection | `PromptAssembler` system prompt includes the ambiguity rule; (model behavior not asserted) |
| 6 — sequential logging | integration: N commits → ordered, immutable log |

These six test groups are the "constitution" of the suite — they must exist and pass.
