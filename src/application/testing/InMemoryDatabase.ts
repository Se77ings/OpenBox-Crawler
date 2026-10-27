import { CrawlRun } from '@obc/domain/crawlRuns/CrawlRun';
import type { ICrawlRunRepository } from '@obc/domain/crawlRuns/ICrawlRunRepository';
import type { IPriceHistoryRepository } from '@obc/domain/products/IPriceHistoryRepository';
import type { IProductRepository } from '@obc/domain/products/IProductRepository';
import type { PriceHistoryEntry } from '@obc/domain/products/PriceHistoryEntry';
import type { Product } from '@obc/domain/products/Product';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import type { IUnitOfWork } from '@obc/domain/shared/IUnitOfWork';
import type { IUnitOfWorkFactory } from '@obc/domain/shared/IUnitOfWorkFactory';
import type { Money } from '@obc/domain/shared/Money';
import type { IWebsiteRepository } from '@obc/domain/websites/IWebsiteRepository';
import { Website } from '@obc/domain/websites/Website';

/**
 * Banco em memória com a mesma semântica do real: as escritas só valem no commit e as
 * entidades são guardadas como cópias, então uma alteração sem `save` não é persistida.
 */
export class InMemoryDatabase implements IUnitOfWorkFactory {
  readonly websites = new Map<string, Website>();
  readonly runs = new Map<string, CrawlRun>();
  readonly activeRuns = new Map<string, string>();
  readonly history: PriceHistoryEntry[] = [];
  products: Product[] = [];
  /** Faz o próximo commit falhar, para simular um erro de banco. */
  failNextCommit = false;

  create(): IUnitOfWork {
    return new InMemoryUnitOfWork(this);
  }

  activeProducts(websiteId: string): Product[] {
    const runId = this.activeRuns.get(websiteId);
    return this.products.filter((p) => p.websiteId === websiteId && p.runId === runId);
  }
}

class InMemoryUnitOfWork implements IUnitOfWork {
  private pending: (() => void)[] = [];

  constructor(private readonly db: InMemoryDatabase) {}

  readonly websites: IWebsiteRepository = {
    findById: async (id) => copyWebsite(this.db.websites.get(id)),
    findByBaseUrl: async (baseUrl) =>
      copyWebsite([...this.db.websites.values()].find((w) => w.baseUrl === baseUrl)),
    save: async (website) => {
      const copy = copyWebsite(website);
      this.enqueue(() => this.db.websites.set(copy.id, copy));
    },
    remove: async (id) => {
      this.enqueue(() => {
        this.db.websites.delete(id);
        this.db.activeRuns.delete(id);
        this.db.products = this.db.products.filter((p) => p.websiteId !== id);
      });
    },
  };

  readonly crawlRuns: ICrawlRunRepository = {
    findById: async (id) => copyRun(this.db.runs.get(id)),
    findUnfinishedByWebsite: async (websiteId) =>
      copyRun([...this.db.runs.values()].find((r) => r.websiteId === websiteId && !r.isFinished)),
    listUnfinished: async () =>
      [...this.db.runs.values()].filter((r) => !r.isFinished).map((r) => copyRun(r)),
    save: async (run) => {
      const copy = copyRun(run);
      this.enqueue(() => this.db.runs.set(copy.id, copy));
    },
  };

  readonly products: IProductRepository = {
    insertMany: async (products) => {
      this.enqueue(() => this.db.products.push(...products));
    },
    activateRun: async (websiteId, runId) => {
      this.enqueue(() => {
        this.db.activeRuns.set(websiteId, runId);
        this.db.products = this.db.products.filter(
          (p) => p.websiteId !== websiteId || p.runId === runId,
        );
      });
    },
    discardRun: async (runId) => {
      this.enqueue(() => {
        this.db.products = this.db.products.filter((p) => p.runId !== runId);
      });
    },
  };

  readonly priceHistory: IPriceHistoryRepository = {
    findLastPrices: async (keys) => {
      const lastPrices = new Map<ProductKey, Money>();
      for (const entry of [...this.db.history].sort(
        (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
      )) {
        if (keys.includes(entry.productKey)) {
          lastPrices.set(entry.productKey, entry.price);
        }
      }
      return lastPrices;
    },
    append: async (entries) => {
      this.enqueue(() => this.db.history.push(...entries));
    },
  };

  async commit(): Promise<void> {
    const writes = this.pending;
    this.pending = [];
    if (this.db.failNextCommit) {
      this.db.failNextCommit = false;
      throw new Error('Falha simulada no commit');
    }
    for (const write of writes) {
      write();
    }
  }

  private enqueue(write: () => void): void {
    this.pending.push(write);
  }
}

function copyWebsite(website: Website): Website;
function copyWebsite(website: Website | undefined): Website | null;
function copyWebsite(website: Website | undefined): Website | null {
  if (!website) {
    return null;
  }
  return Website.restore({
    id: website.id,
    name: website.name,
    openBoxUrl: website.openBoxUrl,
    logoUrl: website.logoUrl,
    extractorKey: website.extractorKey,
    status: website.status,
    lastCrawlAt: website.lastCrawlAt,
    createdAt: website.createdAt,
  });
}

function copyRun(run: CrawlRun): CrawlRun;
function copyRun(run: CrawlRun | undefined): CrawlRun | null;
function copyRun(run: CrawlRun | undefined): CrawlRun | null {
  if (!run) {
    return null;
  }
  return CrawlRun.restore({
    id: run.id,
    websiteId: run.websiteId,
    status: run.status,
    pagesReceived: run.pagesReceived,
    productsFound: run.productsFound,
    newProducts: run.newProducts,
    priceDrops: run.priceDrops,
    error: run.error,
    startedAt: run.startedAt,
    lastActivityAt: run.lastActivityAt,
    finishedAt: run.finishedAt,
  });
}
