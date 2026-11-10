/**
 * Thread (Chat) — the aggregate root (doc 05 §3.1).
 *
 * One chat = one main, linear Thread (D7): no status, no archive, no sub-threads (Q3/Q4).
 * The only lifecycle action is a soft delete (Q4).
 *
 * Pure domain: no DB, React, or model imports (NFR-06.4, doc 05 §8).
 * Time is injected (`at` parameters, doc 09 §6); `Date.now()` is only a default
 * convenience for the server layer — tests always inject explicit timestamps.
 */
import { Message, type MessageRole } from './message.ts';
import { assertValidBody, assertValidMessage } from './message-policy.ts';
import { ThreadPolicyError } from './types.ts';

// Re-exported so existing `./thread.ts` imports (incl. tests) keep working unchanged.
export {
  type ThreadPolicyCode,
  ThreadPolicyError,
  type ThreadSummary,
} from './types.ts';

export class Thread {
  private threadId: number | null;
  private deleted: boolean;
  private messages: Message[];
  private nextMessageId: number;

  private constructor(
    id: number | null,
    public readonly recruiterName: string,
    public readonly company: string,
    public readonly createdAt: number,
    deleted: boolean,
    messages: Message[],
    nextMessageId: number,
  ) {
    this.threadId = id;
    this.deleted = deleted;
    this.messages = messages;
    this.nextMessageId = nextMessageId;
  }

  /** DB id after persistence (Q19); null until the repository assigns it. */
  get id(): number | null {
    return this.threadId;
  }

  /** I1: recruiter name and company are non-empty. (Q2: no uniqueness constraint.) */
  static create(
    recruiterName: string,
    company: string,
    at: number = Date.now(),
  ): Thread {
    if (recruiterName.trim().length === 0) {
      throw new ThreadPolicyError(
        'empty_recruiter_name',
        'Recruiter name must not be empty.',
      );
    }
    if (company.trim().length === 0) {
      throw new ThreadPolicyError(
        'empty_company',
        'Company must not be empty.',
      );
    }
    return new Thread(null, recruiterName, company, at, false, [], 1);
  }

  /** Rebuild the aggregate from persisted state (repository hydration, doc 05 §6). */
  static rehydrate(init: {
    id: number;
    recruiterName: string;
    company: string;
    createdAt: number;
    isDeleted: boolean;
    messages: Message[];
  }): Thread {
    const maxId = init.messages.reduce((max, m) => Math.max(max, m.id), 0);
    return new Thread(
      init.id,
      init.recruiterName,
      init.company,
      init.createdAt,
      init.isDeleted,
      [...init.messages],
      maxId + 1,
    );
  }

  /** The repository sets the DB id after insertion (Q19). Idempotent. */
  assignId(id: number): void {
    if (this.threadId !== null && this.threadId !== id) {
      throw new ThreadPolicyError(
        'id_already_assigned',
        `Thread id already assigned: ${this.threadId} !== ${id}`,
      );
    }
    this.threadId = id;
  }

  /** Append a message; enforces I3 (role + body). Time injected (doc 09 §6). */
  addMessage(
    role: MessageRole | string,
    body: string,
    at: number = Date.now(),
  ): Message {
    assertValidMessage(role, body);
    const message = new Message({
      id: this.nextMessageId++,
      role: role as MessageRole,
      body,
      createdAt: at,
    });
    this.messages.push(message);
    return message;
  }

  /**
   * Q5a (confirmed): the body can be edited for any role.
   * Position (createdAt) is unchanged (I2); `updatedAt` is set (Q5).
   */
  editMessage(id: number, body: string, at: number = Date.now()): Message {
    assertValidBody(body);
    const message = this.activeMessageOrThrow(id);
    message.edit(body, at);
    return message;
  }

  /** Q5b (confirmed): soft delete — recoverable (I4); excluded from view + AI context (I6). */
  deleteMessage(id: number): void {
    const message = this.activeMessageOrThrow(id);
    message.markDeleted();
  }

  /** I6: non-deleted messages only, ordered by (createdAt, id) — I2. */
  activeMessages(): ReadonlyArray<Message> {
    return this.orderedMessages().filter((m) => !m.isDeleted());
  }

  /** Q4 (confirmed): soft delete — the only thread lifecycle action (I7). */
  markDeleted(): void {
    this.deleted = true;
  }

  isDeleted(): boolean {
    return this.deleted;
  }

  /** Q7 sort key: last non-deleted message, else the thread's createdAt. */
  lastActivity(): number {
    const active = this.activeMessages();
    const last = active[active.length - 1];
    return last ? last.createdAt : this.createdAt;
  }

  /** Read-model for the sidebar/tab (doc 05 §3.3). */
  toSummary(): ThreadSummary {
    return {
      id: this.id,
      recruiterName: this.recruiterName,
      company: this.company,
      lastActivity: this.lastActivity(),
      isDeleted: this.deleted,
    };
  }

  private orderedMessages(): Message[] {
    return [...this.messages].sort(
      (a, b) => a.createdAt - b.createdAt || a.id - b.id,
    );
  }

  private activeMessageOrThrow(id: number): Message {
    const message = this.messages.find((m) => m.id === id && !m.isDeleted());
    if (!message) {
      throw new ThreadPolicyError(
        'message_not_found',
        `No active message with id ${id} in this thread.`,
      );
    }
    return message;
  }
}
