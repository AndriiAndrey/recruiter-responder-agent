/**
 * Types for the Thread aggregate: policy errors + read-model VO (doc 05 §3.3).
 * Kept separate from the aggregate so `thread.ts` holds one concern (R1, slice-0 rehearsal).
 *
 * Pure domain: no DB, React, or model imports (NFR-06.4, doc 05 §8).
 */

export type ThreadPolicyCode =
  | 'empty_recruiter_name'
  | 'empty_company'
  | 'id_already_assigned'
  | 'message_not_found';

export class ThreadPolicyError extends Error {
  readonly code: ThreadPolicyCode;

  constructor(code: ThreadPolicyCode, message: string) {
    super(message);
    this.name = 'ThreadPolicyError';
    this.code = code;
  }
}

/** Read-model for the sidebar/tab (doc 05 §3.3). `id` is null until persisted. */
export interface ThreadSummary {
  id: number | null;
  recruiterName: string;
  company: string;
  /** Last non-deleted message's createdAt, else the thread's createdAt (Q7 sort key). */
  lastActivity: number;
  isDeleted: boolean;
}
