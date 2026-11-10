# Test Plan — slice-0 (RETRO mode: audit of existing suite)

> ⚠ **Pipeline gap discovered (P7):** the AC→test map demands 1:1 coverage per slice, but some
> invariants are inherently owned by later slices (I5 anchor rule → slice 3). Without an
> explicit **deferral convention** (`deferred → slice N, reason`) the tester is stuck. → added
> to the agent file + this map uses it.

## 1. AC → test map

| AC / invariant | Test (file :: name) | Kind |
|----------------|--------------------|------|
| I1 (AC-S0-1) | `thread.test.ts` :: "creates a thread with non-empty name + company", "rejects an empty/whitespace recruiter name", "rejects an empty/whitespace company" | pure domain |
| Q2 (AC-S0-1) | `thread.test.ts` :: "no uniqueness constraint — the same (recruiter, company) pair can repeat" | pure domain |
| Q19 (AC-S0-1) | `thread.test.ts` :: "id is null until the repository assigns it", "assignId is idempotent but rejects a conflicting id" | pure domain |
| I2 (AC-S0-9) | `thread.test.ts` :: "appends messages in chronological order (ties by id)", "reads are ordered by (createdAt, id) even if added out of order", "editing keeps the message's position" | pure domain |
| I3 (AC-S0-9) | `thread.test.ts` :: "rejects an empty body", "rejects a body over the 32 KB cap", "rejects an unknown role", "edit applies the same body rules" | pure domain |
| Q6 (AC-S0-9) | `message.test.ts` :: "role set is exactly recruiter \| user_reply \| user_note", "isMessageRole accepts only the three roles", `message-policy.test.ts` :: "accepts each of the three roles", "rejects roles outside the closed set" | pure domain |
| Q21 (AC-S0-9) | `message-policy.test.ts` :: "accepts a body at exactly the 32 KB cap", "rejects a body 1 byte over", "the cap counts UTF-8 bytes, not characters" | pure domain |
| I4 (AC-S0-9) | `thread.test.ts` :: "the body can be edited for ANY role", "deleteMessage is a soft delete", "editing or deleting an unknown/already-deleted message throws" | pure domain |
| I6 (AC-S0-9) | `thread.test.ts` :: "activeMessages excludes deleted messages, ordered", `message.test.ts` :: "soft-delete flag defaults to false" | pure domain |
| I7 (AC-S0-9) | `thread.test.ts` :: "a thread has NO status — soft delete is the only lifecycle action" | pure domain |
| Q7 (sort key) | `thread.test.ts` :: "lastActivity: last non-deleted message's createdAt", "the thread's createdAt when there are no active messages" | pure domain |
| SPEC-01 AC-1 (read-model) | `thread.test.ts` :: "toSummary: maps to the sidebar read-model" | pure domain |
| doc 06 §5 (prompt line) | `message.test.ts` :: "toPromptLine: '[n] Role: body' format" | pure domain |
| hydration (doc 05 §6) | `thread.test.ts` :: "rehydrates with DB ids and continues the message id sequence" | pure domain |
| **I5 (anchor rule)** | — **deferred → slice 3 (SPEC-03)**: `PromptAssembler` doesn't exist yet; I5 is owned by the prompt-assembly tests (doc 09 §2.1) | — |

Coverage: 39 tests, all pure-domain unit; zero mocks (nothing to mock); time injected via
explicit `at` arguments (doc 09 §6) ✅; names reference IDs (doc 09 §4) ✅.

## 2. Kinds

- **Pure domain:** 39/39 (the whole slice-0 surface is domain + schema).
- **Server-with-fakes:** none exist yet (no `src/server/`) — starts slice 3.
- **jsdom components:** none (no UI) — starts slice 1.
- **MVP scope (Q37/Q38):** no integration/E2E ✅ (none present).

## 3. Guardrail obligations (D3)

Slice 0 touches no AI path → no guardrail test owed **in this slice**. The D3 guardrail tests
(prompt-safety + no-telemetry, doc 09 §2.5) are owed starting **slice 3** (SPEC-03 test
obligations) — recorded here so the slice-3 tester doesn't miss them.

## 4. Expected state

- **Forward run:** RED at this stage (unimplemented imports) — n/a.
- **Retro run (this one):** GREEN — `vitest run` → 39/39 pass (verified by the reviewer gate).
- **After coder R3:** `npm run test:coverage` must report `src/domain/**` ≥ 90% (Q36); the
  per-glob config must not fail on the not-yet-existing `src/server/**`.

## 5. Test-quality findings (for reviewer)

- T1 (non-blocking): `thread.test.ts` is 262 lines / ~24 tests — acceptable for the aggregate
  (one concern), but the "rehydration" describe should move with `types.ts`? No — rehydration is
  aggregate behavior; keep. **No change.**
- T2 (non-blocking): `events.ts` has no tests — types-only file, no runtime surface. **No change.**
- T3 (blocking→coder): coverage floor unenforceable (package missing) — remediation R3.
