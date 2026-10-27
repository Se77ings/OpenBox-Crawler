import type { WebsiteStatus } from '@obc/domain/websites/WebsiteStatus';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const websitesTable = sqliteTable('websites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull().unique(),
  openBoxUrl: text('open_box_url').notNull(),
  logoUrl: text('logo_url'),
  extractorKey: text('extractor_key'),
  status: text('status').$type<WebsiteStatus>().notNull(),
  lastCrawlAt: integer('last_crawl_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
