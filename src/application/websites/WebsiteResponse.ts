import type { Website } from '@obc/domain/websites/Website';
import type { WebsiteStatus } from '@obc/domain/websites/WebsiteStatus';

export interface WebsiteResponse {
  id: string;
  name: string;
  baseUrl: string;
  openBoxUrl: string;
  logoUrl: string | null;
  extractorKey: string | null;
  status: WebsiteStatus;
  lastCrawlAt: Date | null;
  createdAt: Date;
}

export function toWebsiteResponse(website: Website): WebsiteResponse {
  return {
    id: website.id,
    name: website.name,
    baseUrl: website.baseUrl,
    openBoxUrl: website.openBoxUrl.value,
    logoUrl: website.logoUrl,
    extractorKey: website.extractorKey,
    status: website.status,
    lastCrawlAt: website.lastCrawlAt,
    createdAt: website.createdAt,
  };
}
