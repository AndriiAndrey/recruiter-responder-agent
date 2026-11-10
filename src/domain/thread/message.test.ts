import { describe, expect, it } from 'vitest';

import { isMessageRole, MESSAGE_ROLES, Message } from './message.ts';

describe('Message (Q6 / doc 05 §3.2)', () => {
  const base = {
    id: 1,
    role: 'recruiter' as const,
    body: 'Hello',
    createdAt: 1_000,
  };

  it('Q6: the role set is exactly recruiter | user_reply | user_note', () => {
    expect(MESSAGE_ROLES).toEqual(['recruiter', 'user_reply', 'user_note']);
  });

  it('Q6: isMessageRole accepts only the three roles (closed set)', () => {
    expect(isMessageRole('recruiter')).toBe(true);
    expect(isMessageRole('user_reply')).toBe(true);
    expect(isMessageRole('user_note')).toBe(true);
    expect(isMessageRole('user')).toBe(false);
    expect(isMessageRole('')).toBe(false);
    expect(isMessageRole(42)).toBe(false);
  });

  it('displaySender: distinct label per role (FR-07)', () => {
    expect(new Message(base).displaySender()).toBe('Recruiter');
    expect(new Message({ ...base, role: 'user_reply' }).displaySender()).toBe(
      'User reply',
    );
    expect(new Message({ ...base, role: 'user_note' }).displaySender()).toBe(
      'User note',
    );
  });

  it('isFromRecruiter: only the recruiter role', () => {
    expect(new Message(base).isFromRecruiter()).toBe(true);
    expect(new Message({ ...base, role: 'user_reply' }).isFromRecruiter()).toBe(
      false,
    );
  });

  it('isDeleted: soft-delete flag defaults to false (I4 / Q5b)', () => {
    const message = new Message(base);
    expect(message.isDeleted()).toBe(false);
    message.markDeleted();
    expect(message.isDeleted()).toBe(true);
  });

  it('edit: updates body + updatedAt; createdAt unchanged (Q5 / I2)', () => {
    const message = new Message(base);
    message.edit('Changed', 2_000);
    expect(message.body).toBe('Changed');
    expect(message.updatedAt).toBe(2_000);
    expect(message.createdAt).toBe(1_000);
  });

  it("toPromptLine: '[n] Role: body' format (doc 06 §5)", () => {
    expect(new Message(base).toPromptLine(3)).toBe('[3] Recruiter: Hello');
  });
});
