# SPEC-04 — CV Context Management

**Status:** Draft → **Approved** (Q22 confirmed: block on missing/empty)
**Requirements:** FR-13…14
**Blocking questions (resolved):** Q22 — confirmed (block generation on missing/empty `context.md`).
**Depends on:** slice 0 (`data/context.md` placeholder created)

## Goal
Treat `data/context.md` as the **single source of truth** for the user's CV, read fresh on each
generation, and surface its state so the user knows generation is grounded.

## User stories
- As a user, I keep my CV in one file and the AI uses only that, so my representation is
  consistent and deterministic.
- As a user, I can see whether the CV is present before I generate, so I don't get a confusing failure.

## Scope
### In
- `data/context.md` as the only CV input (file on disk, user-authored).
- Server `CvContextService` reads it fresh per call; reports `{ exists, nonEmpty, size }`.
- Missing/empty policy: block generation with a clear message (Q22 = fail).
- UI indicator of CV status (present / empty / missing).
- Committed **placeholder** `data/context.md` with clear "fill this in" markup (no fabricated CV).

### Out (explicit)
- Storing the CV in the DB (the file is the source of truth).
- Editing the CV *inside* the app in v1 (user edits the file directly). A read-only preview is
  optional (see AC-6).
- Caching the CV across generations (always read fresh).

## Data
- No DB table. The CV is a **file**: `data/context.md`.
- `CvContext` value object = the file's markdown string (doc 05 §3.3).
- Placeholder file is committed; the user's real content is local (gitignored recommended).

## Interfaces
| SF | Name | Input | Output |
|----|------|-------|--------|
| SF-07 | `getContextStatus` | — | `{ exists: bool, nonEmpty: bool, sizeBytes: int }` |
| (internal) | used by SF-06 | — | `CvContext` (full content) for prompt assembly |

UI surfaces:
- **CV status indicator** (e.g., in the app footer/toolbar): "CV ready" / "CV empty — please fill `data/context.md`" / "CV missing".
- (Optional, AC-6) read-only preview of `context.md`.

## Behavior (acceptance criteria)
- AC-1 (FR-13): `data/context.md` is read **fresh** on every generation (no stale cache).
- AC-2 (FR-13): Only this file's content is used for CV context — no second CV source.
- AC-3 (FR-13): The repo ships a clearly-marked placeholder `data/context.md`; it contains **no**
  fabricated CV facts.
- AC-4 (FR-14 / Q22): `getContextStatus` correctly reports missing vs empty vs present.
- AC-5 (FR-14 / Q22): When missing/empty, generation is blocked with a clear, actionable message
  (ties to SPEC-03 AC-5).
- AC-6 (FR-14, optional): A read-only preview of `context.md` is available for reference.
- AC-7 (PRD-2): The CV content passed to the model is exactly the file content (delimited as data).

## Edge cases & error handling
- File unreadable / permission error: typed `context_missing`-like error with a safe message.
- Very large CV: size reported; if it alone exceeds the model window → `context_too_large`
  (SPEC-03 AC-13); UI suggests shortening.
- Non-UTF8 / binary content: treat as invalid → `context_missing`-like error.
- Trailing whitespace/newlines: preserved (it's the user's file).

## AI / privacy constraints affected
- **PRD-2 (single source of truth for CV):** the file is the only CV input — AC-1/2/7.
- **PRD-1 (local):** the file is local; never uploaded. Reading is a local `fs` read in a server fn.
- **NFR-09.2:** CV content is never logged (logs carry size/hash only).

## Test obligations (doc 09)
- **Unit:** `CvContext` empty/missing detection; `CvContextService` reports `{exists, nonEmpty, size}`
  for: missing file, empty file, whitespace-only file, populated file.
- **Integration (post-MVP, Q38):** `getContextStatus` against a temp `data/` fixture in each state; `generateAnswer`
  returns `context_missing` when empty (cross-check with SPEC-03).
- **Guardrail (unit):** CV is read via local `fs` only; no network.

## Changelog
- v1 (2026): initial draft.
- v2 (2026): Q22 confirmed (block on missing/empty).
- v3 (2026): integration test obligations deferred post-MVP (Q38: MVP is unit tests only).
