import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnitOfWorkFactory } from '../database/UnitOfWorkFactory';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { makeRun, makeWebsite, NOW } from '../testing/fixtures';

const at = (minutes: number): Date => new Date(NOW.getTime() + minutes * 60_000);

describe('CrawlRunRepository', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;

  beforeEach(async () => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
    const uow = factory.create();
    await uow.websites.save(makeWebsite());
    await uow.commit();
  });
  afterEach(() => {
    db.dispose();
  });

  it('grava e reconstrói a rodada com o estado atual', async () => {
    const run = makeRun('r1');
    run.registerPage({ maxPages: 20, now: at(1) });
    run.beginProcessing(at(2));
    run.complete({ productsFound: 40, newProducts: 3, priceDrops: 2 }, at(3));
    const uow = factory.create();
    await uow.crawlRuns.save(run);
    await uow.commit();

    const loaded = await uow.crawlRuns.findById('r1');

    expect(loaded?.status).toBe('completed');
    expect(loaded?.pagesReceived).toBe(1);
    expect(loaded?.productsFound).toBe(40);
    expect(loaded?.newProducts).toBe(3);
    expect(loaded?.priceDrops).toBe(2);
    expect(loaded?.startedAt).toEqual(NOW);
    expect(loaded?.finishedAt).toEqual(at(3));
  });

  it('encontra a rodada em andamento do site e ignora as finalizadas', async () => {
    const finished = makeRun('antiga', 'pichau', at(0));
    finished.cancel(at(1));
    const uow = factory.create();
    await uow.crawlRuns.save(finished);
    await uow.crawlRuns.save(makeRun('atual', 'pichau', at(10)));
    await uow.commit();

    expect((await uow.crawlRuns.findUnfinishedByWebsite('pichau'))?.id).toBe('atual');
    expect((await uow.crawlRuns.listUnfinished()).map((run) => run.id)).toEqual(['atual']);
  });

  it('retorna null quando o site não tem rodada em andamento', async () => {
    expect(await factory.create().crawlRuns.findUnfinishedByWebsite('pichau')).toBeNull();
  });
});
