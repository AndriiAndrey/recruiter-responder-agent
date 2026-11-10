/**
 * Message — one chronological, committed entry in a Thread (doc 05 §3.2).
 *
 * Pure domain: no DB, React, or model imports (NFR-06.4, doc 05 §8).
 * Timestamps are epoch milliseconds, UTC (Q20).
 */

/** Q6 (confirmed): the three sender roles; all three are in the AI context. */
export const MESSAGE_ROLES = ['recruiter', 'user_reply', 'user_note'] as const;

export type MessageRole = (typeof MESSAGE_ROLES)[number];

/** Closed-set check for a role (I3 / Q6). */
export function isMessageRole(value: unknown): value is MessageRole {
  return (
    typeof value === 'string' &&
    (MESSAGE_ROLES as readonly string[]).includes(value)
  );
}

/** Display + prompt label per role (doc 06 §5). */
const ROLE_LABELS: Record<MessageRole, string> = {
  recruiter: 'Recruiter',
  user_reply: 'User reply',
  user_note: 'User note',
};

export class Message {
  readonly id: number;
  readonly role: MessageRole;
  body: string;
  /** Chronological position — fixed at creation, unchanged by edits (I2). */
  readonly createdAt: number;
  /** Set when the body is edited (Q5); nullable. */
  updatedAt: number | null;
  private deleted: boolean;

  constructor(init: {
    id: number;
    role: MessageRole;
    body: string;
    createdAt: number;
    updatedAt?: number | null;
    isDeleted?: boolean;
  }) {
    this.id = init.id;
    this.role = init.role;
    this.body = init.body;
    this.createdAt = init.createdAt;
    this.updatedAt = init.updatedAt ?? null;
    this.deleted = init.isDeleted ?? false;
  }

  /** Who said it, for display (FR-07). */
  displaySender(): string {
    return ROLE_LABELS[this.role];
  }

  isFromRecruiter(): boolean {
    return this.role === 'recruiter';
  }

  isDeleted(): boolean {
    return this.deleted;
  }

  /** One line for the prompt: "[n] Role: body" (doc 06 §5; numbering by the assembler). */
  toPromptLine(index: number): string {
    return `[${index}] ${ROLE_LABELS[this.role]}: ${this.body}`;
  }

  /** Q5a (confirmed): editing is allowed for any role; position is unchanged (I2). */
  edit(body: string, at: number): void {
    this.body = body;
    this.updatedAt = at;
  }

  /** Q5b (confirmed): soft delete — the row is retained (I4). */
  markDeleted(): void {
    this.deleted = true;
  }
}
