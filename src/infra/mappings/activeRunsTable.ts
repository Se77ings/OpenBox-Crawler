import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { websitesTable } from './websitesTable';

/** Rodada cujos produtos estão visíveis na listagem, uma por site. */
export const activeRunsTable = sqliteTable('active_runs', {
  websiteId: text('website_id')
    .primaryKey()
    .references(() => websitesTable.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull(),
});
