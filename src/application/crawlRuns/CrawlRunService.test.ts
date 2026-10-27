import { beforeEach, describe, expect, it } from 'vitest';
import { BROKEN_LAYOUT_HTML, fakePageHtml, type FakeItem } from '../testing/FakeProductExtractor';
import {
  createTestApplication,
  STORE_URL,
  type TestApplication,
} from '../testing/createTestApplication';

describe('CrawlRunService', () => {
  let t: TestApplication;
  let websiteId: string;

  /** Executa uma busca completa com uma página por lista de produtos. */
  async function crawl(...pages: FakeItem[][]): Promise<string> {
    const { runId } = await t.app.crawlRuns.start(websiteId);
    for (const items of pages) {
      await t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html: fakePageHtml(items) });
    }
    await t.app.crawlRuns.complete(runId);
    return runId;
  }

  const activePrices = (): Record<string, number> =>
    Object.fromEntries(
      t.db.activeProducts(websiteId).map((p) => [p.externalId ?? '', p.price.cents]),
    );

  beforeEach(async () => {
    t = createTestApplication();
    const website = await t.app.websites.register({
      openBoxUrl: STORE_URL,
      name: 'Loja',
      logoUrl: null,
      extractorKey: 'fake',
    });
    websiteId = website.id;
  });

  describe('start', () => {
    it('cria a busca e informa à extensão o que abrir', async () => {
      const started = await t.app.crawlRuns.start(websiteId);

      expect(started).toEqual({
        runId: expect.any(String) as string,
        url: STORE_URL,
        readySelector: '.produtos',
        maxPages: 3,
      });
      expect((await t.app.crawlRuns.getStatus(started.runId)).status).toBe('pending');
    });

    it('recusa uma segunda busca enquanto a primeira está em andamento', async () => {
      await t.app.crawlRuns.start(websiteId);
      await expect(t.app.crawlRuns.start(websiteId)).rejects.toMatchObject({
        code: 'crawl-run.already-running',
      });
    });

    it('encerra uma busca abandonada e permite começar outra', async () => {
      const { runId: abandoned } = await t.app.crawlRuns.start(websiteId);
      t.clock.advanceMinutes(11);

      await t.app.crawlRuns.start(websiteId);

      const status = await t.app.crawlRuns.getStatus(abandoned);
      expect(status.status).toBe('failed');
      expect(status.error).toMatch(/interrompida/);
    });

    it('recusa site pausado', async () => {
      await t.app.websites.update(websiteId, { status: 'paused' });
      await expect(t.app.crawlRuns.start(websiteId)).rejects.toMatchObject({
        code: 'website.paused',
      });
    });

    it('recusa site inexistente', async () => {
      await expect(t.app.crawlRuns.start('nao-existe')).rejects.toMatchObject({
        code: 'website.not-found',
      });
    });
  });

  describe('receivePage', () => {
    it('guarda a página e devolve a ação para a próxima', async () => {
      const { runId } = await t.app.crawlRuns.start(websiteId);

      const response = await t.app.crawlRuns.receivePage(runId, {
        url: STORE_URL,
        html: fakePageHtml([{ sku: 'A', priceCents: 100 }], true),
      });

      expect(response).toEqual({
        pagesReceived: 1,
        nextPage: { type: 'click', selector: '.proxima' },
      });
      expect(t.capturedPages.pagesByRun.get(runId)?.[0]?.pageNumber).toBe(1);
      expect((await t.app.crawlRuns.getStatus(runId)).status).toBe('capturing');
    });

    it('encerra a paginação ao atingir o limite de páginas', async () => {
      const { runId } = await t.app.crawlRuns.start(websiteId);
      const html = fakePageHtml([], true);
      await t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html });
      await t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html });

      const third = await t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html });

      expect(third).toEqual({ pagesReceived: 3, nextPage: null });
      await expect(
        t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html }),
      ).rejects.toMatchObject({ code: 'crawl-run.page-limit' });
    });

    it('recusa página de outro site', async () => {
      const { runId } = await t.app.crawlRuns.start(websiteId);
      await expect(
        t.app.crawlRuns.receivePage(runId, { url: 'https://outra.com.br/x', html: '{}' }),
      ).rejects.toMatchObject({ code: 'crawl-run.foreign-page' });
    });
  });

  describe('complete', () => {
    it('ativa os produtos da primeira busca, todos como novos', async () => {
      const runId = await crawl(
        [
          { sku: 'A', priceCents: 1000 },
          { sku: 'B', priceCents: 2000 },
        ],
        [{ sku: 'C', priceCents: 3000 }],
      );

      const status = await t.app.crawlRuns.getStatus(runId);
      expect(status).toMatchObject({
        status: 'completed',
        productsFound: 3,
        newProducts: 3,
        priceDrops: 0,
      });
      expect(activePrices()).toEqual({ A: 1000, B: 2000, C: 3000 });
      expect(t.db.history).toHaveLength(3);
      expect((await t.app.websites.update(websiteId, { name: 'Loja' })).lastCrawlAt).toEqual(
        t.clock.now(),
      );
    });

    it('compara com a busca anterior: baixou, subiu, inalterado e novo', async () => {
      await crawl([
        { sku: 'baixou', priceCents: 1000 },
        { sku: 'subiu', priceCents: 1000 },
        { sku: 'igual', priceCents: 1000 },
        { sku: 'saiu', priceCents: 1000 },
      ]);
      t.clock.advanceMinutes(60);

      const runId = await crawl([
        { sku: 'baixou', priceCents: 800 },
        { sku: 'subiu', priceCents: 1200 },
        { sku: 'igual', priceCents: 1000 },
        { sku: 'novo', priceCents: 500 },
      ]);

      expect(await t.app.crawlRuns.getStatus(runId)).toMatchObject({
        productsFound: 4,
        newProducts: 1,
        priceDrops: 1,
      });
      expect(activePrices()).toEqual({ baixou: 800, subiu: 1200, igual: 1000, novo: 500 });
      const changes = Object.fromEntries(
        t.db.activeProducts(websiteId).map((p) => [p.externalId ?? '', p.priceChange.kind]),
      );
      expect(changes).toEqual({
        baixou: 'dropped',
        subiu: 'raised',
        igual: 'unchanged',
        novo: 'new',
      });
      // 4 da primeira busca + baixou, subiu e novo; "igual" não gera nova entrada.
      expect(t.db.history).toHaveLength(7);
    });

    it('não duplica um produto que aparece em duas páginas', async () => {
      await crawl([{ sku: 'A', priceCents: 1000 }], [{ sku: 'A', priceCents: 1000 }]);
      expect(t.db.activeProducts(websiteId)).toHaveLength(1);
    });

    describe('quando o processamento falha', () => {
      beforeEach(async () => {
        await crawl([{ sku: 'anterior', priceCents: 1000 }]);
      });

      it('registra o motivo do extrator e mantém a busca anterior', async () => {
        const { runId } = await t.app.crawlRuns.start(websiteId);
        await t.app.crawlRuns.receivePage(runId, { url: STORE_URL, html: BROKEN_LAYOUT_HTML });

        const result = await t.app.crawlRuns.complete(runId);

        expect(result.status).toBe('failed');
        expect(result.error).toMatch(/Layout da loja de teste mudou/);
        expect(activePrices()).toEqual({ anterior: 1000 });
      });

      it('falha em vez de apagar tudo quando nenhum produto é encontrado', async () => {
        const runId = await crawl([]);

        const status = await t.app.crawlRuns.getStatus(runId);
        expect(status.status).toBe('failed');
        expect(status.error).toMatch(/Nenhum produto/);
        expect(activePrices()).toEqual({ anterior: 1000 });
      });

      it('não grava nada quando o banco falha ao concluir', async () => {
        t.extractor.onExtract = () => {
          t.db.failNextCommit = true;
        };

        const runId = await crawl([{ sku: 'novo', priceCents: 500 }]);

        const status = await t.app.crawlRuns.getStatus(runId);
        expect(status.status).toBe('failed');
        expect(status.error).toMatch(/Erro inesperado.*Falha simulada/);
        expect(activePrices()).toEqual({ anterior: 1000 });
        expect(t.db.history).toHaveLength(1);
      });
    });
  });

  it('registra falha relatada pela extensão', async () => {
    const { runId } = await t.app.crawlRuns.start(websiteId);
    const result = await t.app.crawlRuns.fail(runId, { reason: 'A página não carregou' });
    expect(result).toMatchObject({ status: 'failed', error: 'A página não carregou' });
  });

  it('cancela durante a captura e libera o site para outra busca', async () => {
    const { runId } = await t.app.crawlRuns.start(websiteId);
    expect((await t.app.crawlRuns.cancel(runId)).status).toBe('cancelled');
    await expect(t.app.crawlRuns.start(websiteId)).resolves.toBeDefined();
  });

  it('encerra periodicamente as buscas abandonadas', async () => {
    await t.app.crawlRuns.start(websiteId);
    expect(await t.app.crawlRuns.failStaleRuns()).toBe(0);

    t.clock.advanceMinutes(11);
    expect(await t.app.crawlRuns.failStaleRuns()).toBe(1);
  });

  it('limpa as capturas mais antigas que a retenção', async () => {
    await t.app.crawlRuns.cleanUpCaptures();
    const thirtyDaysAgo = new Date(t.clock.now().getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(t.capturedPages.lastCleanupCutoff).toEqual(thirtyDaysAgo);
  });
});
