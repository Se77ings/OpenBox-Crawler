import { CrawlRun } from '@obc/domain/crawlRuns/CrawlRun';
import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { ExtractedProduct } from '@obc/domain/extraction/ExtractedProduct';
import { ExtractionError } from '@obc/domain/extraction/ExtractionError';
import type { ICapturedPageStore } from '@obc/domain/extraction/ICapturedPageStore';
import type { IExtractorRegistry } from '@obc/domain/extraction/IExtractorRegistry';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import type { PaginationAction } from '@obc/domain/extraction/PaginationAction';
import type { PriceHistoryEntry } from '@obc/domain/products/PriceHistoryEntry';
import { Product } from '@obc/domain/products/Product';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import { DomainError } from '@obc/domain/shared/DomainError';
import type { IClock } from '@obc/domain/shared/IClock';
import type { IIdGenerator } from '@obc/domain/shared/IIdGenerator';
import type { IUnitOfWork } from '@obc/domain/shared/IUnitOfWork';
import type { IUnitOfWorkFactory } from '@obc/domain/shared/IUnitOfWorkFactory';
import type { Website } from '@obc/domain/websites/Website';
import { NotFoundError } from '../shared/NotFoundError';
import type { CrawlOptions } from './CrawlOptions';
import { toCrawlRunResponse, type CrawlRunResponse } from './CrawlRunResponse';
import type { FailCrawlRunRequest } from './FailCrawlRunRequest';
import type { ReceivePageRequest } from './ReceivePageRequest';
import type { ReceivePageResponse } from './ReceivePageResponse';
import type { StartCrawlRunResponse } from './StartCrawlRunResponse';

const ABANDONED_REASON = 'A captura foi interrompida (nenhuma página recebida por muito tempo).';

export interface CrawlRunServiceDependencies {
  unitOfWork: IUnitOfWorkFactory;
  extractors: IExtractorRegistry;
  capturedPages: ICapturedPageStore;
  ids: IIdGenerator;
  clock: IClock;
  options: CrawlOptions;
}

/**
 * Ciclo de uma busca: o front inicia, a extensão envia as páginas uma a uma e, ao fim da
 * captura, todas são processadas juntas. Os produtos só substituem os da busca anterior
 * quando o processamento termina com sucesso.
 */
export class CrawlRunService {
  constructor(private readonly deps: CrawlRunServiceDependencies) {}

  async start(websiteId: string): Promise<StartCrawlRunResponse> {
    const now = this.deps.clock.now();
    const uow = this.deps.unitOfWork.create();
    const website = await this.requireWebsite(uow, websiteId);
    website.ensureCanCrawl();
    const extractor = this.requireExtractor(website);

    const running = await uow.crawlRuns.findUnfinishedByWebsite(website.id);
    if (running && !running.isStale(now, this.deps.options.staleAfterMs)) {
      throw new DomainError(
        'crawl-run.already-running',
        `Já existe uma busca em andamento para "${website.name}".`,
      );
    }
    if (running) {
      await this.abandon(uow, running, now);
    }

    const run = CrawlRun.start({ id: this.deps.ids.next(), websiteId: website.id, now });
    await uow.crawlRuns.save(run);
    await uow.commit();

    return {
      runId: run.id,
      url: website.openBoxUrl.value,
      readySelector: extractor.readySelector,
      maxPages: this.deps.options.maxPagesPerRun,
    };
  }

  async receivePage(runId: string, request: ReceivePageRequest): Promise<ReceivePageResponse> {
    const now = this.deps.clock.now();
    const { maxPagesPerRun } = this.deps.options;
    const uow = this.deps.unitOfWork.create();
    const run = await this.requireRun(uow, runId);
    const website = await this.requireWebsite(uow, run.websiteId);

    if (!website.openBoxUrl.isSameHostAs(request.url)) {
      throw new DomainError(
        'crawl-run.foreign-page',
        `A página recebida não é de ${website.openBoxUrl.hostname}.`,
      );
    }
    run.registerPage({ maxPages: maxPagesPerRun, now });

    const page: CapturedPage = {
      url: request.url,
      html: request.html,
      capturedAt: now,
      pageNumber: run.pagesReceived,
    };
    await this.deps.capturedPages.save(run.id, page);
    await uow.crawlRuns.save(run);
    await uow.commit();

    const nextPage = run.pagesReceived < maxPagesPerRun ? this.findNextPage(website, page) : null;
    return { pagesReceived: run.pagesReceived, nextPage };
  }

  /**
   * Se o extrator não reconhece a página (layout mudou), a captura apenas termina: o erro
   * aparece com a mensagem clara no processamento, em vez de interromper a extensão.
   */
  private findNextPage(website: Website, page: CapturedPage): PaginationAction | null {
    try {
      return this.requireExtractor(website).findNextPage(page);
    } catch (error) {
      if (error instanceof ExtractionError) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Processa as páginas capturadas. Uma falha (ex.: o layout do site mudou) não é
   * propagada: a busca termina como `failed` com o motivo, e a anterior continua valendo.
   */
  async complete(runId: string): Promise<CrawlRunResponse> {
    const now = this.deps.clock.now();
    const uow = this.deps.unitOfWork.create();
    const run = await this.requireRun(uow, runId);
    const website = await this.requireWebsite(uow, run.websiteId);

    run.beginProcessing(now);
    await uow.crawlRuns.save(run);
    await uow.commit();

    try {
      return await this.process(run, website, now);
    } catch (error) {
      return this.failAfterProcessingError(run.id, describe(error), now);
    }
  }

  async fail(runId: string, request: FailCrawlRunRequest): Promise<CrawlRunResponse> {
    const now = this.deps.clock.now();
    const uow = this.deps.unitOfWork.create();
    const run = await this.requireRun(uow, runId);
    run.fail(request.reason, now);
    await this.saveDiscarded(uow, run);
    return toCrawlRunResponse(run);
  }

  async cancel(runId: string): Promise<CrawlRunResponse> {
    const now = this.deps.clock.now();
    const uow = this.deps.unitOfWork.create();
    const run = await this.requireRun(uow, runId);
    run.cancel(now);
    await this.saveDiscarded(uow, run);
    return toCrawlRunResponse(run);
  }

  async getStatus(runId: string): Promise<CrawlRunResponse> {
    const run = await this.requireRun(this.deps.unitOfWork.create(), runId);
    return toCrawlRunResponse(run);
  }

  /** Encerra as buscas abandonadas. Pensado para rodar periodicamente; retorna quantas. */
  async failStaleRuns(): Promise<number> {
    const now = this.deps.clock.now();
    const uow = this.deps.unitOfWork.create();
    const stale = (await uow.crawlRuns.listUnfinished()).filter((run) =>
      run.isStale(now, this.deps.options.staleAfterMs),
    );
    for (const run of stale) {
      await this.abandon(uow, run, now);
    }
    await uow.commit();
    return stale.length;
  }

  /** Apaga o HTML das buscas mais antigas que a retenção configurada. */
  async cleanUpCaptures(): Promise<number> {
    const cutoff = new Date(
      this.deps.clock.now().getTime() - this.deps.options.capturesRetentionMs,
    );
    return this.deps.capturedPages.deleteOlderThan(cutoff);
  }

  private async process(run: CrawlRun, website: Website, now: Date): Promise<CrawlRunResponse> {
    const extractor = this.requireExtractor(website);
    const pages = await this.deps.capturedPages.list(run.id);
    const extracted = deduplicate(
      website.id,
      pages.flatMap((page) => extractor.extract(page)),
    );
    if (extracted.size === 0) {
      throw new ExtractionError(
        'Nenhum produto foi encontrado nas páginas capturadas. O layout do site pode ter mudado.',
      );
    }

    const uow = this.deps.unitOfWork.create();
    const lastPrices = await uow.priceHistory.findLastPrices([...extracted.keys()]);
    const products = [...extracted].map(([key, item]) =>
      Product.create({
        ...item,
        id: this.deps.ids.next(),
        runId: run.id,
        websiteId: website.id,
        previousPrice: lastPrices.get(key) ?? null,
        collectedAt: now,
      }),
    );

    // O histórico só registra mudanças: um preço igual ao anterior não gera entrada.
    const history: PriceHistoryEntry[] = products
      .filter((product) => product.priceChange.kind !== 'unchanged')
      .map((product) => ({ productKey: product.key, price: product.price, observedAt: now }));

    await uow.products.insertMany(products);
    await uow.products.activateRun(website.id, run.id);
    await uow.priceHistory.append(history);

    run.complete(
      {
        productsFound: products.length,
        newProducts: products.filter((product) => product.priceChange.kind === 'new').length,
        priceDrops: products.filter((product) => product.priceChange.kind === 'dropped').length,
      },
      now,
    );
    website.recordCrawl(now);
    await uow.crawlRuns.save(run);
    await uow.websites.save(website);
    await uow.commit();

    return toCrawlRunResponse(run);
  }

  private async failAfterProcessingError(
    runId: string,
    reason: string,
    now: Date,
  ): Promise<CrawlRunResponse> {
    // A rodada é relida do banco: em memória, ela pode ter sido marcada como concluída
    // antes de o commit falhar.
    const uow = this.deps.unitOfWork.create();
    const run = await this.requireRun(uow, runId);
    run.fail(reason, now);
    await this.saveDiscarded(uow, run);
    return toCrawlRunResponse(run);
  }

  private async abandon(uow: IUnitOfWork, run: CrawlRun, now: Date): Promise<void> {
    run.fail(ABANDONED_REASON, now);
    await uow.crawlRuns.save(run);
    await uow.products.discardRun(run.id);
  }

  private async saveDiscarded(uow: IUnitOfWork, run: CrawlRun): Promise<void> {
    await uow.crawlRuns.save(run);
    await uow.products.discardRun(run.id);
    await uow.commit();
  }

  private requireExtractor(website: Website): IProductExtractor {
    const extractor = website.extractorKey
      ? this.deps.extractors.getByKey(website.extractorKey)
      : null;
    if (!extractor) {
      throw new DomainError(
        'website.without-extractor',
        `Ainda não há como ler os produtos de "${website.name}".`,
      );
    }
    return extractor;
  }

  private async requireWebsite(uow: IUnitOfWork, id: string): Promise<Website> {
    const website = await uow.websites.findById(id);
    if (!website) {
      throw new NotFoundError('website', id);
    }
    return website;
  }

  private async requireRun(uow: IUnitOfWork, id: string): Promise<CrawlRun> {
    const run = await uow.crawlRuns.findById(id);
    if (!run) {
      throw new NotFoundError('crawl-run', id);
    }
    return run;
  }
}

/** O mesmo produto pode aparecer em mais de uma página: fica a primeira ocorrência. */
function deduplicate(
  websiteId: string,
  items: ExtractedProduct[],
): Map<ProductKey, ExtractedProduct> {
  const unique = new Map<ProductKey, ExtractedProduct>();
  for (const item of items) {
    const key = Product.keyOf(websiteId, item.externalId, item.url);
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }
  return unique;
}

function describe(error: unknown): string {
  if (error instanceof DomainError) {
    return error.message;
  }
  const detail = error instanceof Error ? `: ${error.message}` : '';
  return `Erro inesperado ao processar a busca${detail}`;
}
