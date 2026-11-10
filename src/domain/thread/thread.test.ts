import { describe, expect, it } from 'vitest';

import { Message } from './message.ts';
import {
  MAX_MESSAGE_BODY_BYTES,
  MessagePolicyError,
} from './message-policy.ts';
import { Thread, ThreadPolicyError } from './thread.ts';

/** Fixed clock (doc 09 §6: no real Date.now() in domain tests). */
const T0 = 1_700_000_000_000;
const step = 1_000;

function newThread(name = 'Ada', company = 'Acme'): Thread {
  return Thread.create(name, company, T0);
}

describe('Thread (SPEC-01 / doc 05 §3.1)', () => {
  describe('I1 — creation', () => {
    it('creates a thread with non-empty name + company', () => {
      const thread = newThread();
      expect(thread.recruiterName).toBe('Ada');
      expect(thread.company).toBe('Acme');
      expect(thread.createdAt).toBe(T0);
    });

    it('rejects an empty/whitespace recruiter name', () => {
      expect(() => Thread.create('', 'Acme', T0)).toThrow(
        'Recruiter name must not be empty.',
      );
      expect(() => Thread.create('   ', 'Acme', T0)).toThrow(ThreadPolicyError);
    });

    it('rejects an empty/whitespace company', () => {
      expect(() => Thread.create('Ada', '', T0)).toThrow(
        'Company must not be empty.',
      );
      expect(() => Thread.create('Ada', '  ', T0)).toThrow(ThreadPolicyError);
    });

    it('Q2: no uniqueness constraint — the same (recruiter, company) pair can repeat', () => {
      const a = newThread('Ada', 'Acme');
      const b = newThread('Ada', 'Acme');
      expect(a.recruiterName).toBe(b.recruiterName);
      expect(a.company).toBe(b.company);
    });

    it('id is null until the repository assigns it (Q19)', () => {
      const thread = newThread();
      expect(thread.id).toBeNull();
      thread.assignId(7);
      expect(thread.id).toBe(7);
    });

    it('assignId is idempotent but rejects a conflicting id', () => {
      const thread = newThread();
      thread.assignId(7);
      expect(() => thread.assignId(7)).not.toThrow();
      expect(() => thread.assignId(8)).toThrow(ThreadPolicyError);
    });
  });

  describe('I2/I3 — messages', () => {
    it('appends messages in chronological order (ties by id)', () => {
      const thread = newThread();
      thread.addMessage('recruiter', 'Hi', T0 + step);
      thread.addMessage('user_reply', 'Hello!', T0 + 2 * step);
      thread.addMessage('user_note', 'follow up on monday', T0 + 3 * step);
      expect(thread.activeMessages().map((m) => m.body)).toEqual([
        'Hi',
        'Hello!',
        'follow up on monday',
      ]);
    });

    it('I2: reads are ordered by (createdAt, id) even if added out of order', () => {
      const thread = newThread();
      thread.addMessage('recruiter', 'second', T0 + 2 * step);
      thread.addMessage('recruiter', 'first', T0 + step);
      expect(thread.activeMessages().map((m) => m.body)).toEqual([
        'first',
        'second',
      ]);
    });

    it('I3: rejects an empty body', () => {
      const thread = newThread();
      expect(() => thread.addMessage('recruiter', '   ', T0 + step)).toThrow(
        MessagePolicyError,
      );
    });

    it('I3 / Q21: rejects a body over the 32 KB cap', () => {
      const thread = newThread();
      expect(() =>
        thread.addMessage(
          'recruiter',
          'a'.repeat(MAX_MESSAGE_BODY_BYTES + 1),
          T0 + step,
        ),
      ).toThrow(MessagePolicyError);
    });

    it('I3 / Q6: rejects an unknown role', () => {
      const thread = newThread();
      expect(() => thread.addMessage('bot', 'hi', T0 + step)).toThrow(
        MessagePolicyError,
      );
    });

    it('stores all three roles (Q6)', () => {
      const thread = newThread();
      thread.addMessage('recruiter', 'r', T0 + step);
      thread.addMessage('user_reply', 'u', T0 + 2 * step);
      thread.addMessage('user_note', 'n', T0 + 3 * step);
      expect(thread.activeMessages().map((m) => m.role)).toEqual([
        'recruiter',
        'user_reply',
        'user_note',
      ]);
    });
  });

  describe('I4 — edit + soft delete (Q5/Q5a/Q5b)', () => {
    it('Q5a: the body can be edited for ANY role', () => {
      const thread = newThread();
      for (const role of ['recruiter', 'user_reply', 'user_note'] as const) {
        const m = thread.addMessage(role, 'before', T0 + step);
        const edited = thread.editMessage(m.id, 'after', T0 + 2 * step);
        expect(edited.body).toBe('after');
        expect(edited.updatedAt).toBe(T0 + 2 * step);
      }
    });

    it("I2: editing keeps the message's position (createdAt untouched)", () => {
      const thread = newThread();
      const first = thread.addMessage('recruiter', 'first', T0 + step);
      thread.addMessage('recruiter', 'second', T0 + 2 * step);
      thread.editMessage(first.id, 'first (edited)', T0 + 99 * step);
      expect(thread.activeMessages().map((m) => m.body)).toEqual([
        'first (edited)',
        'second',
      ]);
      expect(first.createdAt).toBe(T0 + step);
    });

    it('I3: edit applies the same body rules (non-empty, cap)', () => {
      const thread = newThread();
      const m = thread.addMessage('recruiter', 'hi', T0 + step);
      expect(() => thread.editMessage(m.id, '  ', T0 + 2 * step)).toThrow(
        MessagePolicyError,
      );
      expect(() =>
        thread.editMessage(
          m.id,
          'a'.repeat(MAX_MESSAGE_BODY_BYTES + 1),
          T0 + 2 * step,
        ),
      ).toThrow(MessagePolicyError);
    });

    it('I4 / Q5b: deleteMessage is a soft delete (row retained, recoverable flag)', () => {
      const thread = newThread();
      const m = thread.addMessage('recruiter', 'hi', T0 + step);
      thread.deleteMessage(m.id);
      expect(m.isDeleted()).toBe(true);
      expect(m.body).toBe('hi'); // data retained
      expect(thread.activeMessages()).toHaveLength(0);
    });

    it('editing or deleting an unknown/already-deleted message throws message_not_found', () => {
      const thread = newThread();
      const m = thread.addMessage('recruiter', 'hi', T0 + step);
      thread.deleteMessage(m.id);
      expect(() => thread.editMessage(m.id, 'nope', T0 + 2 * step)).toThrow(
        ThreadPolicyError,
      );
      expect(() => thread.deleteMessage(999)).toThrow(ThreadPolicyError);
    });
  });

  describe('I6/I7 — visibility + lifecycle (Q3/Q4, D7)', () => {
    it('I6: activeMessages excludes deleted messages, ordered', () => {
      const thread = newThread();
      const a = thread.addMessage('recruiter', 'a', T0 + step);
      thread.addMessage('recruiter', 'b', T0 + 2 * step);
      thread.addMessage('recruiter', 'c', T0 + 3 * step);
      thread.deleteMessage(a.id);
      expect(thread.activeMessages().map((m) => m.body)).toEqual(['b', 'c']);
    });

    it('I7: a thread has NO status — soft delete is the only lifecycle action', () => {
      const thread = newThread();
      expect('status' in thread).toBe(false);
      expect('archive' in thread).toBe(false);
      expect(thread.isDeleted()).toBe(false);
      thread.markDeleted();
      expect(thread.isDeleted()).toBe(true);
      expect(thread.toSummary().isDeleted).toBe(true);
    });
  });

  describe('Q7 — lastActivity / summary', () => {
    it("lastActivity: last non-deleted message's createdAt", () => {
      const thread = newThread();
      thread.addMessage('recruiter', 'a', T0 + step);
      thread.addMessage('user_reply', 'b', T0 + 2 * step);
      expect(thread.lastActivity()).toBe(T0 + 2 * step);
    });

    it("lastActivity: the thread's createdAt when there are no active messages", () => {
      const thread = newThread();
      expect(thread.lastActivity()).toBe(T0);
      thread.addMessage('recruiter', 'a', T0 + step);
      thread.deleteMessage(1);
      expect(thread.lastActivity()).toBe(T0);
    });

    it('toSummary: maps to the sidebar read-model (SPEC-01 AC-1)', () => {
      const thread = newThread('Grace', 'Hopper Labs');
      thread.addMessage('recruiter', 'hi', T0 + step);
      thread.assignId(3);
      expect(thread.toSummary()).toEqual({
        id: 3,
        recruiterName: 'Grace',
        company: 'Hopper Labs',
        lastActivity: T0 + step,
        isDeleted: false,
      });
    });
  });

  describe('rehydration (repository path, doc 05 §6)', () => {
    it('rehydrates with DB ids and continues the message id sequence', () => {
      const hydrated = Thread.rehydrate({
        id: 5,
        recruiterName: 'Ada',
        company: 'Acme',
        createdAt: T0,
        isDeleted: false,
        messages: [
          new Message({
            id: 11,
            role: 'recruiter',
            body: 'old',
            createdAt: T0 + step,
          }),
          new Message({
            id: 12,
            role: 'user_reply',
            body: 'newer',
            createdAt: T0 + 2 * step,
          }),
        ],
      });
      expect(hydrated.id).toBe(5);
      expect(hydrated.activeMessages().map((m) => m.id)).toEqual([11, 12]);
      const next = hydrated.addMessage('user_note', 'next', T0 + 3 * step);
      expect(next.id).toBe(13);
    });
  });
});
