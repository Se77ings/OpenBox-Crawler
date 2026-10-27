import type { CrawlRunStatus } from '../crawlRuns/CrawlRunStatus';
import type { WebsiteStatus } from './WebsiteStatus';

/** Linha da tela de sites: o site com o resumo da última busca. */
export interface WebsiteListItemView {
  id: string;
  name: string;
  baseUrl: string;
  openBoxUrl: string;
  logoUrl: string | null;
  extractorKey: string | null;
  status: WebsiteStatus;
  activeProducts: number;
  lastRun: {
    id: string;
    status: CrawlRunStatus;
    productsFound: number;
    newProducts: number;
    priceDrops: number;
    finishedAt: Date | null;
  } | null;
}
