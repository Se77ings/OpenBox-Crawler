import Database from 'better-sqlite3';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { makeRun, makeWebsite } from '../testing/fixtures';
import { UnitOfWorkFactory } from './UnitOfWorkFactory';

describe('UnitOfWork', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;

  beforeEach(() => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
  });
  afterEach(() => {
    db.dispose();
  });

  it('só grava as alterações no commit', async () => {
    const uow = factory.create();
    await uow.websites.save(makeWebsite());

    expect(await uow.websites.findById('pichau')).toBeNull();

    await uow.commit();
    expect(await uow.websites.findById('pichau')).not.toBeNull();
  });

  it('desfaz todas as escritas quando uma delas falha', async () => {
    const uow = factory.create();
    await uow.websites.save(makeWebsite());
    // Rodada de um site inexistente: viola a chave estrangeira no meio do commit.
    await uow.crawlRuns.save(makeRun('r1', 'site-inexistente'));

    await expect(uow.commit()).rejects.toThrow(/FOREIGN KEY/);
    expect(await factory.create().websites.findById('pichau')).toBeNull();
  });

  it('não mistura alterações pendentes de unidades diferentes', async () => {
    const first = factory.create();
    const second = factory.create();
    await first.websites.save(makeWebsite('pichau'));
    await second.websites.save(makeWebsite('terabyte', 'https://www.terabyteshop.com.br/open-box'));

    await second.commit();

    const reader = factory.create();
    expect(await reader.websites.findById('terabyte')).not.toBeNull();
    expect(await reader.websites.findById('pichau')).toBeNull();
  });

  it('esvazia as alterações pendentes depois do commit', async () => {
    const uow = factory.create();
    await uow.websites.save(makeWebsite());
    await uow.commit();
    await uow.websites.remove('pichau');
    await uow.commit();

    // Se o save tivesse ficado na fila, o segundo commit recriaria o site.
    expect(await uow.websites.findById('pichau')).toBeNull();
  });

  it('cria cada tabela no arquivo de banco certo', () => {
    const tablesOf = (file: string): string[] => {
      const connection = new Database(join(db.dataDir, file), { readonly: true });
      const rows = connection
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'",
        )
        .all() as { name: string }[];
      connection.close();
      return rows.map((row) => row.name).sort();
    };

    expect(tablesOf('obc.db')).toEqual(['active_runs', 'crawl_runs', 'price_history', 'websites']);
    expect(tablesOf('offers.db')).toEqual(['products']);
  });
});
