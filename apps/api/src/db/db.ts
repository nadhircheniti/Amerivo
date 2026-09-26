import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** Driver-agnostic database type (node-postgres in the app, PGlite in tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export const DB = Symbol("DB");

export function createDb(url: string): { db: Db; close: () => Promise<void> } {
  const pool = new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
  return { db: drizzle(pool, { schema }) as unknown as Db, close: () => pool.end() };
}
