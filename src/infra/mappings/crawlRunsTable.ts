import type { CrawlRunStatus } from '@obc/domain/crawlRuns/CrawlRunStatus';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { websitesTable } from './websitesTable';

export const crawlRunsTable = sqliteTable(
  'crawl_runs',
  {
    id: text('id').primaryKey(),
    websiteId: text('website_id')
      .notNull()
      .references(() => websitesTable.id, { onDelete: 'cascade' }),
    status: text('status').$type<CrawlRunStatus>().notNull(),
    pagesReceived: integer('pages_received').notNull(),
    productsFound: integer('products_found').notNull(),
    newProducts: integer('new_products').notNull(),
    priceDrops: integer('price_drops').notNull(),
    error: text('error'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    lastActivityAt: integer('last_activity_at', { mode: 'timestamp_ms' }).notNull(),
    finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('crawl_runs_website_started_idx').on(table.websiteId, table.startedAt)],
);
