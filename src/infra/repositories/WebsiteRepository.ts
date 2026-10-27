import type { IWebsiteRepository } from '@obc/domain/websites/IWebsiteRepository';
import { Website } from '@obc/domain/websites/Website';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../database/DbClient';
import type { EnqueueWrite } from '../database/PendingWrite';
import { productsTable } from '../mappings/productsTable';
import { websitesTable } from '../mappings/websitesTable';

type WebsiteRow = typeof websitesTable.$inferSelect;

export class WebsiteRepository implements IWebsiteRepository {
  constructor(
    private readonly db: DbClient,
    private readonly enqueue: EnqueueWrite,
  ) {}

  async findById(id: string): Promise<Website | null> {
    const row = this.db.select().from(websitesTable).where(eq(websitesTable.id, id)).get();
    return row ? toWebsite(row) : null;
  }

  async findByBaseUrl(baseUrl: string): Promise<Website | null> {
    const row = this.db
      .select()
      .from(websitesTable)
      .where(eq(websitesTable.baseUrl, baseUrl))
      .get();
    return row ? toWebsite(row) : null;
  }

  async save(website: Website): Promise<void> {
    const row = toWebsiteRow(website);
    this.enqueue((tx) => {
      tx.insert(websitesTable)
        .values(row)
        .onConflictDoUpdate({ target: websitesTable.id, set: row })
        .run();
    });
  }

  async remove(id: string): Promise<void> {
    this.enqueue((tx) => {
      // Rodadas e rodada ativa saem em cascata; os produtos ficam em outro banco e o
      // histórico de preços é mantido de propósito.
      tx.delete(productsTable).where(eq(productsTable.websiteId, id)).run();
      tx.delete(websitesTable).where(eq(websitesTable.id, id)).run();
    });
  }
}

function toWebsite(row: WebsiteRow): Website {
  return Website.restore({
    id: row.id,
    name: row.name,
    openBoxUrl: WebsiteUrl.parse(row.openBoxUrl),
    logoUrl: row.logoUrl,
    extractorKey: row.extractorKey,
    status: row.status,
    lastCrawlAt: row.lastCrawlAt,
    createdAt: row.createdAt,
  });
}

function toWebsiteRow(website: Website): WebsiteRow {
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
