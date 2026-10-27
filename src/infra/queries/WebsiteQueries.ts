import type { IWebsiteQueries } from '@obc/domain/websites/IWebsiteQueries';
import type { WebsiteListItemView } from '@obc/domain/websites/WebsiteListItemView';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import type { DbClient } from '../database/DbClient';
import { activeRunsTable } from '../mappings/activeRunsTable';
import { crawlRunsTable } from '../mappings/crawlRunsTable';
import { productsTable } from '../mappings/productsTable';
import { websitesTable } from '../mappings/websitesTable';

export class WebsiteQueries implements IWebsiteQueries {
  constructor(private readonly db: DbClient) {}

  async listWithStats(): Promise<WebsiteListItemView[]> {
    const websites = this.db.select().from(websitesTable).orderBy(asc(websitesTable.name)).all();

    const latestStartedAt = this.db
      .select({ websiteId: crawlRunsTable.websiteId, startedAt: max(crawlRunsTable.startedAt) })
      .from(crawlRunsTable)
      .groupBy(crawlRunsTable.websiteId);
    const lastRuns = this.db
      .select()
      .from(crawlRunsTable)
      .where(
        sql`(${crawlRunsTable.websiteId}, ${crawlRunsTable.startedAt}) IN (${latestStartedAt})`,
      )
      .all();
    const lastRunByWebsite = new Map(lastRuns.map((run) => [run.websiteId, run]));

    const productCounts = this.db
      .select({ websiteId: productsTable.websiteId, value: count() })
      .from(productsTable)
      .innerJoin(
        activeRunsTable,
        and(
          eq(activeRunsTable.websiteId, productsTable.websiteId),
          eq(activeRunsTable.runId, productsTable.runId),
        ),
      )
      .groupBy(productsTable.websiteId)
      .all();
    const productCountByWebsite = new Map(productCounts.map((row) => [row.websiteId, row.value]));

    return websites.map((website) => {
      const lastRun = lastRunByWebsite.get(website.id);
      return {
        id: website.id,
        name: website.name,
        baseUrl: website.baseUrl,
        openBoxUrl: website.openBoxUrl,
        logoUrl: website.logoUrl,
        extractorKey: website.extractorKey,
        status: website.status,
        activeProducts: productCountByWebsite.get(website.id) ?? 0,
        lastRun: lastRun
          ? {
              id: lastRun.id,
              status: lastRun.status,
              productsFound: lastRun.productsFound,
              newProducts: lastRun.newProducts,
              priceDrops: lastRun.priceDrops,
              finishedAt: lastRun.finishedAt,
            }
          : null,
      };
    });
  }
}
