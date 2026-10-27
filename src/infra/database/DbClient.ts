import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export type DbClient = BetterSQLite3Database;

export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];
