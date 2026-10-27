import { Money } from '@obc/domain/shared/Money';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnitOfWorkFactory } from '../database/UnitOfWorkFactory';
import { ProductQueries } from '../queries/ProductQueries';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { makeProduct, makeRun, makeWebsite, NOW } from '../testing/fixtures';

describe('WebsiteRepository', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;

  beforeEach(() => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
  });
  afterEach(() => {
    db.dispose();
  });

  it('grava e reconstrói o site com todos os campos', async () => {
    const website = makeWebsite();
    website.recordCrawl(new Date('2026-10-28T08:30:00.000Z'));
    const uow = factory.create();
    await uow.websites.save(website);
    await uow.commit();

    const loaded = await factory.create().websites.findById('pichau');

    expect(loaded?.name).toBe('pichau');
    expect(loaded?.openBoxUrl.equals(WebsiteUrl.parse('https://www.pichau.com.br/openbox'))).toBe(
      true,
    );
    expect(loaded?.baseUrl).toBe('https://www.pichau.com.br');
    expect(loaded?.extractorKey).toBe('pichau');
    expect(loaded?.status).toBe('active');
    expect(loaded?.lastCrawlAt).toEqual(new Date('2026-10-28T08:30:00.000Z'));
    expect(loaded?.createdAt).toEqual(NOW);
  });

  it('atualiza um site existente', async () => {
    const uow = factory.create();
    const website = makeWebsite();
    await uow.websites.save(website);
    await uow.commit();

    website.rename('Pichau Informática');
    website.pause();
    await uow.websites.save(website);
    await uow.commit();

    const loaded = await uow.websites.findById('pichau');
    expect(loaded?.name).toBe('Pichau Informática');
    expect(loaded?.status).toBe('paused');
  });

  it('encontra o site pela URL base', async () => {
    const uow = factory.create();
    await uow.websites.save(makeWebsite());
    await uow.commit();

    expect((await uow.websites.findByBaseUrl('https://www.pichau.com.br'))?.id).toBe('pichau');
    expect(await uow.websites.findByBaseUrl('https://www.kabum.com.br')).toBeNull();
  });

  it('remove o site com rodadas e produtos, mas mantém o histórico de preços', async () => {
    const uow = factory.create();
    await uow.websites.save(makeWebsite());
    await uow.crawlRuns.save(makeRun('run-1'));
    const product = makeProduct({ id: 'p1' });
    await uow.products.insertMany([product]);
    await uow.products.activateRun('pichau', 'run-1');
    await uow.priceHistory.append([
      { productKey: product.key, price: Money.fromCents(100_00), observedAt: NOW },
    ]);
    await uow.commit();

    await uow.websites.remove('pichau');
    await uow.commit();

    expect(await uow.websites.findById('pichau')).toBeNull();
    expect(await uow.crawlRuns.findById('run-1')).toBeNull();
    const queries = new ProductQueries(db.database.client);
    expect((await queries.list({}, { page: 1, pageSize: 10 })).total).toBe(0);
    expect(await queries.priceHistory(product.key)).toHaveLength(1);
  });
});
