import type { ProductCondition } from '@obc/domain/products/ProductCondition';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Tabela do banco volátil (offers.db). Fica em outro arquivo de banco, por isso não há
// chave estrangeira para websites; a remoção dos produtos é feita pelos repositórios.
export const productsTable = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    websiteId: text('website_id').notNull(),
    productKey: text('product_key').$type<ProductKey>().notNull(),
    externalId: text('external_id'),
    name: text('name').notNull(),
    /** Nome em minúsculas e sem acentos, para a busca por texto. */
    searchName: text('search_name').notNull(),
    url: text('url').notNull(),
    imageUrl: text('image_url'),
    category: text('category'),
    condition: text('condition').$type<ProductCondition>().notNull(),
    priceCents: integer('price_cents').notNull(),
    fullPriceCents: integer('full_price_cents'),
    // Gravado já calculado para que filtro e ordenação por desconto sejam feitos no banco.
    discountPercent: integer('discount_percent'),
    previousPriceCents: integer('previous_price_cents'),
    available: integer('available', { mode: 'boolean' }).notNull(),
    collectedAt: integer('collected_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('products_website_run_idx').on(table.websiteId, table.runId),
    index('products_price_idx').on(table.priceCents),
    index('products_search_name_idx').on(table.searchName),
    index('products_category_idx').on(table.category),
  ],
);
