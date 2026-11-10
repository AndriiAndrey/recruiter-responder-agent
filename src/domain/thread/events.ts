/**
 * Domain events (doc 05 §5) — local only (in-process, for UI + optional audit).
 *
 * The types are the contract; emission is wired in the server layer (slice 1+).
 * At minimum these document the editable-record (I4/I6) and staged-review
 * (PRD-4) invariants and make them testable (doc 09 §7).
 */
import type { MessageRole } from "./message.ts";

interface EventBase {
	at: number;
	threadId: number | null;
}

export type ThreadEvent =
	| (EventBase & { kind: "ThreadCreated" })
	| (EventBase & { kind: "ThreadDeleted" })
	| (EventBase & {
			kind: "MessageCommitted";
			messageId: number;
			role: MessageRole;
	  })
	| (EventBase & { kind: "MessageEdited"; messageId: number })
	| (EventBase & { kind: "MessageDeleted"; messageId: number })
	| (EventBase & { kind: "GenerationRequested"; threadId: number })
	| (EventBase & { kind: "GenerationSucceeded"; threadId: number })
	| (EventBase & { kind: "GenerationFailed"; threadId: number })
	| (EventBase & {
			kind: "DraftCommitted";
			threadId: number;
			messageId: number;
	  });
