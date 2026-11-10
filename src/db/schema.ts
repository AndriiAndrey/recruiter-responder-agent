import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Slice 0 schema (doc 04 — data model, all Q confirmed):
 * - Q2: each chat is one Thread; no uniqueness constraint on (recruiter, company)
 * - Q3: no thread status
 * - Q4: Thread is soft-deletable only (no archive, no hard delete)
 * - Q5/Q5a/Q5b: messages editable (all roles) + soft-deletable
 * - Q6: three sender roles
 * - Q19: integer autoincrement IDs; Q20: ms/UTC timestamps; Q21: 32 KB body cap (zod-side)
 */

export const threads = sqliteTable("threads", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }), // Q19
	recruiterName: text("recruiter_name").notNull(),
	company: text("company").notNull(),
	createdAt: integer("created_at", {
		mode: "timestamp_ms",
	})
		.notNull()
		.default(sql`(unixepoch() * 1000)`), // Q20: ms/UTC
	// Q4 (confirmed): the only lifecycle action — soft delete (no status, no archive)
	isDeleted: integer("is_deleted", { mode: "boolean" })
		.notNull()
		.default(false),
});

export const messages = sqliteTable(
	"messages",
	{
		id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }), // Q19
		threadId: integer("thread_id")
			.notNull()
			.references(() => threads.id, { onDelete: "cascade" }), // safety net; thread delete is soft
		// Q6 (confirmed): the three sender roles
		role: text("role", {
			enum: ["recruiter", "user_reply", "user_note"],
		}).notNull(),
		body: text("body").notNull(), // Q21 (confirmed): 32 KB cap enforced by zod/MessagePolicy
		createdAt: integer("created_at", {
			mode: "timestamp_ms",
		})
			.notNull()
			.default(sql`(unixepoch() * 1000)`), // Q20: ms/UTC
		// Q5/Q5a/Q5b (confirmed): editable + soft-deletable, all roles
		updatedAt: integer("updated_at", { mode: "timestamp_ms" }), // set on edit (nullable)
		isDeleted: integer("is_deleted", { mode: "boolean" })
			.notNull()
			.default(false), // soft delete
	},
	(table) => ({
		threadCreatedIdx: index("messages_thread_created_idx").on(
			table.threadId,
			table.createdAt,
		),
	}),
);
