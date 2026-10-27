import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnitOfWorkFactory } from '../database/UnitOfWorkFactory';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { makeProduct, makeRun, makeWebsite, NOW } from '../testing/fixtures';
import { WebsiteQueries } from './WebsiteQueries';

const at = (minutes: number): Date => new Date(NOW.getTime() + minutes * 60_000);

describe('WebsiteQueries', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;
  let queries: WebsiteQueries;

  beforeEach(() => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
    queries = new WebsiteQueries(db.database.client);
  });
  afterEach(() => {
    db.dispose();
  });

  it('lista os sites com a última rodada e o total de produtos ativos', async () => {
    const previous = makeRun('run-1', 'pichau', at(0));
    previous.registerPage({ maxPages: 20, now: at(1) });
    previous.beginProcessing(at(2));
    previous.complete({ productsFound: 2, newProducts: 2, priceDrops: 0 }, at(3));
    const latest = makeRun('run-2', 'pichau', at(60));

    const uow = factory.create();
    await uow.websites.save(makeWebsite('terabyte', 'https://www.terabyteshop.com.br/open-box'));
    await uow.websites.save(makeWebsite('pichau'));
    await uow.crawlRuns.save(previous);
    await uow.crawlRuns.save(latest);
    await uow.products.insertMany([makeProduct({ id: 'a' }), makeProduct({ id: 'b' })]);
    await uow.products.activateRun('pichau', 'run-1');
    await uow.commit();

    const [pichau, terabyte] = await queries.listWithStats();

    expect(pichau).toMatchObject({
      id: 'pichau',
      baseUrl: 'https://www.pichau.com.br',
      activeProducts: 2,
      lastRun: { id: 'run-2', status: 'pending', finishedAt: null },
    });
    expect(terabyte).toMatchObject({ id: 'terabyte', activeProducts: 0, lastRun: null });
  });
});
