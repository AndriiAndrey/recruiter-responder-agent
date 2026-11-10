import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.ts";

/**
 * The DB file is whatever `DATABASE_URL` resolves to (Q18/D4 — never hardcoded).
 * Server-only: client components must never import this (NFR-06.3).
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error(
		'DATABASE_URL is not set. Set it in .env (e.g. DATABASE_URL="dev.db").',
	);
}

const sqlite = new Database(databaseUrl);
sqlite.pragma("journal_mode = WAL"); // NFR-04.2: crash safety
sqlite.pragma("foreign_keys = ON"); // thread_id FK safety net (doc 04 §2)

export const db = drizzle(sqlite, { schema });
