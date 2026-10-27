import type { ProductFilters } from '@obc/domain/products/ProductFilters';
import { Money } from '@obc/domain/shared/Money';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnitOfWorkFactory } from '../database/UnitOfWorkFactory';
import { productsTable } from '../mappings/productsTable';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { makeProduct, makeRun, makeWebsite, NOW } from '../testing/fixtures';
import { ProductQueries } from './ProductQueries';

const reais = (value: number): Money => Money.fromCents(value * 100);

describe('ProductQueries', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;
  let queries: ProductQueries;

  const listNames = async (filters: ProductFilters = {}): Promise<string[]> =>
    (await queries.list(filters, { page: 1, pageSize: 50 })).items.map((item) => item.name);

  beforeEach(async () => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
    queries = new ProductQueries(db.database.client);

    const uow = factory.create();
    await uow.websites.save(makeWebsite('pichau', 'https://www.pichau.com.br/openbox'));
    await uow.websites.save(makeWebsite('terabyte', 'https://www.terabyteshop.com.br/open-box'));
    await uow.crawlRuns.save(makeRun('run-1', 'pichau'));
    await uow.commit();
  });
  afterEach(() => {
    db.dispose();
  });

  describe('troca de rodada', () => {
    beforeEach(async () => {
      const uow = factory.create();
      await uow.products.insertMany([makeProduct({ id: 'antigo', name: 'Produto antigo' })]);
      await uow.products.activateRun('pichau', 'run-1');
      await uow.commit();
    });

    it('não mostra os produtos de uma rodada ainda não ativada', async () => {
      const uow = factory.create();
      await uow.products.insertMany([
        makeProduct({ id: 'novo', runId: 'run-2', name: 'Produto novo' }),
      ]);
      await uow.commit();

      expect(await listNames()).toEqual(['Produto antigo']);
    });

    it('troca os produtos ao ativar a nova rodada e apaga os da anterior', async () => {
      const uow = factory.create();
      await uow.products.insertMany([
        makeProduct({ id: 'novo', runId: 'run-2', name: 'Produto novo' }),
      ]);
      await uow.products.activateRun('pichau', 'run-2');
      await uow.commit();

      expect(await listNames()).toEqual(['Produto novo']);
      expect(await db.database.client.$count(productsTable)).toBe(1);
    });

    it('descarta uma rodada que falhou e mantém a rodada ativa', async () => {
      const uow = factory.create();
      await uow.products.insertMany([makeProduct({ id: 'falha', runId: 'run-3' })]);
      await uow.commit();
      await uow.products.discardRun('run-3');
      await uow.commit();

      expect(await listNames()).toEqual(['Produto antigo']);
    });

    it('não afeta a rodada ativa de outro site', async () => {
      const uow = factory.create();
      await uow.products.insertMany([
        makeProduct({ id: 't1', websiteId: 'terabyte', runId: 'run-t', name: 'Da Terabyte' }),
      ]);
      await uow.products.activateRun('terabyte', 'run-t');
      await uow.commit();

      expect(await listNames({ sort: 'name-asc' })).toEqual(['Da Terabyte', 'Produto antigo']);
    });
  });

  describe('filtros e ordenação', () => {
    beforeEach(async () => {
      const uow = factory.create();
      await uow.products.insertMany([
        makeProduct({
          id: 'gpu',
          name: 'Placa de Vídeo RTX',
          category: 'Placas de vídeo',
          price: reais(2000),
          fullPrice: reais(2500), // 20%
          previousPrice: reais(2200), // baixou
          collectedAt: new Date(NOW.getTime() + 1000),
        }),
        makeProduct({
          id: 'notebook',
          name: 'Notebook Gamer',
          category: 'Notebooks',
          condition: 'refurbished',
          price: reais(4500),
          fullPrice: reais(6000), // 25%
          previousPrice: reais(4000), // subiu
        }),
        makeProduct({
          id: 'mouse',
          name: 'Mouse sem fio',
          category: 'Periféricos',
          price: reais(80),
          available: false,
        }),
        makeProduct({
          id: 'teclado',
          websiteId: 'terabyte',
          runId: 'run-t',
          name: 'Teclado Mecânico',
          category: 'Periféricos',
          price: reais(300),
          fullPrice: reais(400), // 25%
        }),
      ]);
      await uow.products.activateRun('pichau', 'run-1');
      await uow.products.activateRun('terabyte', 'run-t');
      await uow.commit();
    });

    it('ordena por menor preço por padrão', async () => {
      expect(await listNames()).toEqual([
        'Mouse sem fio',
        'Teclado Mecânico',
        'Placa de Vídeo RTX',
        'Notebook Gamer',
      ]);
    });

    it('ordena por maior desconto, com os sem desconto no fim', async () => {
      const names = await listNames({ sort: 'discount-desc' });
      expect(names.slice(2)).toEqual(['Placa de Vídeo RTX', 'Mouse sem fio']);
      expect(names.slice(0, 2).sort()).toEqual(['Notebook Gamer', 'Teclado Mecânico']);
    });

    it('ordena pelos mais recentes', async () => {
      expect((await listNames({ sort: 'newest' }))[0]).toBe('Placa de Vídeo RTX');
    });

    it('busca por texto sem diferenciar maiúsculas e acentos', async () => {
      expect(await listNames({ text: 'placa de VIDEO' })).toEqual(['Placa de Vídeo RTX']);
      expect(await listNames({ text: 'mecanico' })).toEqual(['Teclado Mecânico']);
    });

    it.each<[string, ProductFilters, string[]]>([
      ['site', { websiteIds: ['terabyte'] }, ['Teclado Mecânico']],
      ['categoria', { category: 'Periféricos' }, ['Mouse sem fio', 'Teclado Mecânico']],
      [
        'faixa de preço',
        { minPriceCents: 100_00, maxPriceCents: 2000_00 },
        ['Teclado Mecânico', 'Placa de Vídeo RTX'],
      ],
      ['desconto mínimo', { minDiscountPercent: 25 }, ['Teclado Mecânico', 'Notebook Gamer']],
      ['condição', { conditions: ['refurbished'] }, ['Notebook Gamer']],
      [
        'só disponíveis',
        { onlyAvailable: true },
        ['Teclado Mecânico', 'Placa de Vídeo RTX', 'Notebook Gamer'],
      ],
      ['só os que baixaram', { onlyPriceDrops: true }, ['Placa de Vídeo RTX']],
    ])('filtra por %s', async (_, filters, expected) => {
      expect(await listNames(filters)).toEqual(expected);
    });

    it('combina filtros', async () => {
      expect(await listNames({ category: 'Periféricos', onlyAvailable: true })).toEqual([
        'Teclado Mecânico',
      ]);
    });

    it('pagina e informa o total', async () => {
      const page = await queries.list({}, { page: 2, pageSize: 3 });
      expect(page.total).toBe(4);
      expect(page.items.map((item) => item.name)).toEqual(['Notebook Gamer']);
    });

    it('monta a view com o site, o desconto e a variação de preço', async () => {
      const [gpu] = (await queries.list({ text: 'rtx' }, { page: 1, pageSize: 1 })).items;

      expect(gpu).toMatchObject({
        websiteId: 'pichau',
        websiteName: 'pichau',
        websiteLogoUrl: 'https://www.pichau.com.br/openbox/logo.png',
        priceCents: 2000_00,
        fullPriceCents: 2500_00,
        discountPercent: 20,
        priceDeltaCents: -200_00,
        available: true,
      });
    });
  });

  it('devolve o histórico de preço em ordem cronológica', async () => {
    const product = makeProduct({ id: 'gpu' });
    const uow = factory.create();
    await uow.priceHistory.append([
      { productKey: product.key, price: reais(2200), observedAt: new Date('2026-10-20') },
      { productKey: product.key, price: reais(2000), observedAt: new Date('2026-10-10') },
    ]);
    await uow.commit();

    expect(await queries.priceHistory(product.key)).toEqual([
      { priceCents: 2000_00, observedAt: new Date('2026-10-10') },
      { priceCents: 2200_00, observedAt: new Date('2026-10-20') },
    ]);
  });
});
