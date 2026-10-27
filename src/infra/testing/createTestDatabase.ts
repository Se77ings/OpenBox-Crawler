import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ObcDatabase } from '../database/ObcDatabase';

export interface TestDatabase {
  database: ObcDatabase;
  dataDir: string;
  dispose(): void;
}

/** Bancos reais numa pasta temporária, com as migrations aplicadas. */
export function createTestDatabase(): TestDatabase {
  const dataDir = mkdtempSync(join(tmpdir(), 'obc-test-'));
  const database = ObcDatabase.open({ dataDir });
  return {
    database,
    dataDir,
    dispose() {
      database.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
