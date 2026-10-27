import type { ProductKey } from '@obc/domain/products/ProductKey';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Sem chave estrangeira para websites: o histórico é mantido mesmo se o site for removido.
export const priceHistoryTable = sqliteTable(
  'price_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productKey: text('product_key').$type<ProductKey>().notNull(),
    priceCents: integer('price_cents').notNull(),
    observedAt: integer('observed_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('price_history_product_observed_idx').on(table.productKey, table.observedAt)],
);
