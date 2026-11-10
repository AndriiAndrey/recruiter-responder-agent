/**
 * MessagePolicy — validation for add/edit (I3, I4, I6, NFR-10.2).
 * Pure domain; throws `MessagePolicyError` with a stable `code` the server layer
 * maps to a typed result (doc 03 §6.3).
 */
import { isMessageRole, type MessageRole } from "./message.ts";

/** Q21 (confirmed): 32 KB cap per message body (UTF-8 bytes). */
export const MAX_MESSAGE_BODY_BYTES = 32 * 1024;

export type MessagePolicyCode = "invalid_role" | "empty_body" | "body_too_long";

export class MessagePolicyError extends Error {
	readonly code: MessagePolicyCode;

	constructor(code: MessagePolicyCode, message: string) {
		super(message);
		this.name = "MessagePolicyError";
		this.code = code;
	}
}

const utf8Encoder = new TextEncoder();

/** Enforce I3 for an add: valid role (Q6 closed set) + valid body. */
export function assertValidMessage(
	role: MessageRole | string,
	body: string,
): void {
	if (!isMessageRole(role)) {
		throw new MessagePolicyError(
			"invalid_role",
			`Unknown message role: ${String(role)}`,
		);
	}
	assertValidBody(body);
}

/** Enforce I3 for a body alone (edit path, Q5a: body rules are role-independent). */
export function assertValidBody(body: string): void {
	if (body.trim().length === 0) {
		throw new MessagePolicyError(
			"empty_body",
			"Message body must not be empty.",
		);
	}
	const bytes = utf8Encoder.encode(body).length;
	if (bytes > MAX_MESSAGE_BODY_BYTES) {
		throw new MessagePolicyError(
			"body_too_long",
			`Message body exceeds the ${MAX_MESSAGE_BODY_BYTES} byte cap (Q21).`,
		);
	}
}
