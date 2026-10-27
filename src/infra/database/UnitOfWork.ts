import type { ICrawlRunRepository } from '@obc/domain/crawlRuns/ICrawlRunRepository';
import type { IPriceHistoryRepository } from '@obc/domain/products/IPriceHistoryRepository';
import type { IProductRepository } from '@obc/domain/products/IProductRepository';
import type { IUnitOfWork } from '@obc/domain/shared/IUnitOfWork';
import type { IWebsiteRepository } from '@obc/domain/websites/IWebsiteRepository';
import { CrawlRunRepository } from '../repositories/CrawlRunRepository';
import { PriceHistoryRepository } from '../repositories/PriceHistoryRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { WebsiteRepository } from '../repositories/WebsiteRepository';
import type { DbClient } from './DbClient';
import type { PendingWrite } from './PendingWrite';

export class UnitOfWork implements IUnitOfWork {
  readonly websites: IWebsiteRepository;
  readonly crawlRuns: ICrawlRunRepository;
  readonly products: IProductRepository;
  readonly priceHistory: IPriceHistoryRepository;

  private pending: PendingWrite[] = [];

  constructor(private readonly db: DbClient) {
    const enqueue = (write: PendingWrite): void => {
      this.pending.push(write);
    };
    this.websites = new WebsiteRepository(db, enqueue);
    this.crawlRuns = new CrawlRunRepository(db, enqueue);
    this.products = new ProductRepository(enqueue);
    this.priceHistory = new PriceHistoryRepository(db, enqueue);
  }

  async commit(): Promise<void> {
    const writes = this.pending;
    this.pending = [];

    // O better-sqlite3 é síncrono: a transação inteira roda sem ceder a vez para outras
    // operações, então nada se intercala entre o BEGIN e o COMMIT. Qualquer erro desfaz
    // todas as escritas.
    this.db.transaction((tx) => {
      for (const write of writes) {
        write(tx);
      }
    });
  }
}
