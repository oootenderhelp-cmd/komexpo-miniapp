/**
 * Database client (Drizzle + postgres.js).
 *
 * The client is created lazily so that unit tests and pure-domain code can run
 * WITHOUT a live PostgreSQL instance. Only code paths that actually touch the
 * DB (migrations, seed, real API handlers) need DATABASE_URL.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema.js";

export type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;
let _sql: ReturnType<typeof postgres> | null = null;

export function getDb(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env before running DB-backed code (seed / migrate / API).",
    );
  }
  _sql = postgres(url, { max: Number(process.env.QUEUE_CONCURRENCY ?? 10) });
  _db = drizzle(_sql, { schema });
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
    _db = null;
  }
}

export { schema };
