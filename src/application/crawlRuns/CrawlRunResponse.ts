import type { CrawlRun } from '@obc/domain/crawlRuns/CrawlRun';
import type { CrawlRunStatus } from '@obc/domain/crawlRuns/CrawlRunStatus';

export interface CrawlRunResponse {
  id: string;
  websiteId: string;
  status: CrawlRunStatus;
  pagesReceived: number;
  productsFound: number;
  newProducts: number;
  priceDrops: number;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}

export function toCrawlRunResponse(run: CrawlRun): CrawlRunResponse {
  return {
    id: run.id,
    websiteId: run.websiteId,
    status: run.status,
    pagesReceived: run.pagesReceived,
    productsFound: run.productsFound,
    newProducts: run.newProducts,
    priceDrops: run.priceDrops,
    error: run.error,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
  };
}
