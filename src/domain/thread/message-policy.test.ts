import { describe, expect, it } from 'vitest';

import {
  assertValidBody,
  assertValidMessage,
  MAX_MESSAGE_BODY_BYTES,
  type MessagePolicyCode,
  MessagePolicyError,
} from './message-policy.ts';

function throwCode(fn: () => void): MessagePolicyCode | undefined {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(MessagePolicyError);
    return (e as MessagePolicyError).code;
  }
  return undefined;
}

describe('MessagePolicy (I3 / Q6 / Q21 / NFR-10.2)', () => {
  it('Q21: accepts a body at exactly the 32 KB cap', () => {
    expect(
      throwCode(() =>
        assertValidMessage('recruiter', 'a'.repeat(MAX_MESSAGE_BODY_BYTES)),
      ),
    ).toBeUndefined();
  });

  it('Q21: rejects a body 1 byte over the 32 KB cap', () => {
    expect(
      throwCode(() =>
        assertValidMessage('recruiter', 'a'.repeat(MAX_MESSAGE_BODY_BYTES + 1)),
      ),
    ).toBe('body_too_long');
  });

  it('Q21: the cap counts UTF-8 bytes, not characters', () => {
    // "é" is 2 bytes in UTF-8: 16384 chars = 32768 bytes = exactly the cap.
    expect(
      throwCode(() =>
        assertValidMessage('recruiter', 'é'.repeat(MAX_MESSAGE_BODY_BYTES / 2)),
      ),
    ).toBeUndefined();
    expect(
      throwCode(() =>
        assertValidMessage(
          'recruiter',
          'é'.repeat(MAX_MESSAGE_BODY_BYTES / 2 + 1),
        ),
      ),
    ).toBe('body_too_long');
  });

  it('I3: rejects empty and whitespace-only bodies', () => {
    expect(throwCode(() => assertValidBody(''))).toBe('empty_body');
    expect(throwCode(() => assertValidBody('   \n\t '))).toBe('empty_body');
    expect(throwCode(() => assertValidBody('ok'))).toBeUndefined();
  });

  it("Q6: rejects roles outside the closed set with code 'invalid_role'", () => {
    expect(throwCode(() => assertValidMessage('user', 'hi'))).toBe(
      'invalid_role',
    );
  });

  it('accepts each of the three roles (Q6)', () => {
    for (const role of ['recruiter', 'user_reply', 'user_note'] as const) {
      expect(throwCode(() => assertValidMessage(role, 'hi'))).toBeUndefined();
    }
  });
});
