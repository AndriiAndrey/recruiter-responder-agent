/**
 * Thread (chat) domain — pure, fully unit-testable (doc 05 §8).
 *
 * Barrel: explicit named exports of the public API consumed outside the folder
 * (no `export *` — barrel discipline, agentci architect rule R2).
 */

export type { ThreadEvent } from './events.ts';
export {
  isMessageRole,
  MESSAGE_ROLES,
  Message,
  type MessageRole,
} from './message.ts';
export {
  assertValidBody,
  assertValidMessage,
  MAX_MESSAGE_BODY_BYTES,
  type MessagePolicyCode,
  MessagePolicyError,
} from './message-policy.ts';
export { Thread } from './thread.ts';
export {
  type ThreadPolicyCode,
  ThreadPolicyError,
  type ThreadSummary,
} from './types.ts';
