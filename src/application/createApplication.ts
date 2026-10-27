import type { ICapturedPageStore } from '@obc/domain/extraction/ICapturedPageStore';
import type { IExtractorRegistry } from '@obc/domain/extraction/IExtractorRegistry';
import type { IWebsiteMetadataExtractor } from '@obc/domain/extraction/IWebsiteMetadataExtractor';
import type { IProductQueries } from '@obc/domain/products/IProductQueries';
import type { IClock } from '@obc/domain/shared/IClock';
import type { IIdGenerator } from '@obc/domain/shared/IIdGenerator';
import type { IUnitOfWorkFactory } from '@obc/domain/shared/IUnitOfWorkFactory';
import type { IWebsiteQueries } from '@obc/domain/websites/IWebsiteQueries';
import { DEFAULT_CRAWL_OPTIONS, type CrawlOptions } from './crawlRuns/CrawlOptions';
import { CrawlRunService } from './crawlRuns/CrawlRunService';
import { ProductQueryService } from './products/ProductQueryService';
import { WebsiteService } from './websites/WebsiteService';

/** Implementações das interfaces do domain, fornecidas pelo composition root (a api). */
export interface ApplicationDependencies {
  unitOfWork: IUnitOfWorkFactory;
  websiteQueries: IWebsiteQueries;
  productQueries: IProductQueries;
  extractors: IExtractorRegistry;
  metadataExtractor: IWebsiteMetadataExtractor;
  capturedPages: ICapturedPageStore;
  ids: IIdGenerator;
  clock: IClock;
  crawlOptions?: Partial<CrawlOptions>;
}

export interface Application {
  websites: WebsiteService;
  crawlRuns: CrawlRunService;
  products: ProductQueryService;
}

/** Registro de dependências da application: monta os serviços com as implementações. */
export function createApplication(deps: ApplicationDependencies): Application {
  return {
    websites: new WebsiteService(deps),
    crawlRuns: new CrawlRunService({
      ...deps,
      options: { ...DEFAULT_CRAWL_OPTIONS, ...deps.crawlOptions },
    }),
    products: new ProductQueryService(deps.productQueries),
  };
}
