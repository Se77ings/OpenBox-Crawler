import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { DbClient } from './DbClient';

export interface ObcDatabaseOptions {
  /** Pasta onde ficam os arquivos obc.db e offers.db. */
  dataDir: string;
  /** Pasta com as subpastas `obc/` e `offers/` geradas pelo drizzle-kit. */
  migrationsDir?: string;
}

const DEFAULT_MIGRATIONS_DIR = join(import.meta.dirname, '..', 'migrations');

/**
 * Abre os dois bancos numa única conexão: obc.db (consistente) como principal e
 * offers.db (volátil) anexado. Como as tabelas têm nomes únicos entre os dois, as
 * consultas não precisam indicar o banco e podem juntar tabelas de ambos.
 */
export class ObcDatabase {
  private constructor(
    readonly client: DbClient,
    private readonly connection: Database.Database,
  ) {}

  static open(options: ObcDatabaseOptions): ObcDatabase {
    const migrationsDir = options.migrationsDir ?? DEFAULT_MIGRATIONS_DIR;
    mkdirSync(options.dataDir, { recursive: true });

    const obcPath = join(options.dataDir, 'obc.db');
    const offersPath = join(options.dataDir, 'offers.db');

    // Cada banco tem as próprias migrations, aplicadas numa conexão exclusiva dele.
    migrateDatabase(offersPath, join(migrationsDir, 'offers'));
    migrateDatabase(obcPath, join(migrationsDir, 'obc'));

    const connection = new Database(obcPath);
    connection.pragma('journal_mode = WAL');
    connection.pragma('foreign_keys = ON');
    connection.prepare('ATTACH DATABASE ? AS offers').run(offersPath);
    connection.pragma('offers.journal_mode = WAL');

    return new ObcDatabase(drizzle(connection), connection);
  }

  close(): void {
    this.connection.close();
  }
}

function migrateDatabase(path: string, migrationsFolder: string): void {
  const connection = new Database(path);
  try {
    connection.pragma('journal_mode = WAL');
    migrate(drizzle(connection), { migrationsFolder });
  } finally {
    connection.close();
  }
}
