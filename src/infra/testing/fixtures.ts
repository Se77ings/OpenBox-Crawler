import { CrawlRun } from '@obc/domain/crawlRuns/CrawlRun';
import { Product, type ProductProps } from '@obc/domain/products/Product';
import { Money } from '@obc/domain/shared/Money';
import { Website } from '@obc/domain/websites/Website';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';

export const NOW = new Date('2026-10-27T12:00:00.000Z');

export function makeWebsite(id = 'pichau', url = 'https://www.pichau.com.br/openbox'): Website {
  return Website.register({
    id,
    name: id,
    openBoxUrl: WebsiteUrl.parse(url),
    logoUrl: `${url}/logo.png`,
    extractorKey: id,
    now: NOW,
  });
}

export function makeRun(id: string, websiteId = 'pichau', startedAt = NOW): CrawlRun {
  return CrawlRun.start({ id, websiteId, now: startedAt });
}

export function makeProduct(overrides: Partial<ProductProps> & { id: string }): Product {
  return Product.create({
    runId: 'run-1',
    websiteId: 'pichau',
    externalId: overrides.id,
    name: `Produto ${overrides.id}`,
    url: `https://www.pichau.com.br/${overrides.id}`,
    imageUrl: null,
    category: 'Hardware',
    condition: 'openbox',
    price: Money.fromCents(100_00),
    fullPrice: null,
    previousPrice: null,
    available: true,
    collectedAt: NOW,
    ...overrides,
  });
}
