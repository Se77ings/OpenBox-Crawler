import type { IProductQueries } from '@obc/domain/products/IProductQueries';
import type { PriceHistoryPointView } from '@obc/domain/products/PriceHistoryPointView';
import type { ProductFilters } from '@obc/domain/products/ProductFilters';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import type { ProductListItemView } from '@obc/domain/products/ProductListItemView';
import type { ProductSort } from '@obc/domain/products/ProductSort';
import type { Page } from '@obc/domain/shared/Page';
import type { PageRequest } from '@obc/domain/shared/PageRequest';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lt,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { DbClient } from '../database/DbClient';
import { activeRunsTable } from '../mappings/activeRunsTable';
import { priceHistoryTable } from '../mappings/priceHistoryTable';
import { productsTable } from '../mappings/productsTable';
import { websitesTable } from '../mappings/websitesTable';
import { normalizeSearchText } from '../shared/normalizeSearchText';

const p = productsTable;

// A listagem mostra só os produtos da rodada ativa de cada site.
const IS_ACTIVE_RUN = and(
  eq(activeRunsTable.websiteId, p.websiteId),
  eq(activeRunsTable.runId, p.runId),
);

const ORDER_BY: Record<ProductSort, SQL[]> = {
  'price-asc': [asc(p.priceCents)],
  // Produtos sem desconto vão para o fim, em vez de aparecerem primeiro como NULL.
  'discount-desc': [sql`${p.discountPercent} IS NULL`, desc(p.discountPercent)],
  'name-asc': [asc(p.searchName)],
  newest: [desc(p.collectedAt)],
};

export class ProductQueries implements IProductQueries {
  constructor(private readonly db: DbClient) {}

  async list(filters: ProductFilters, page: PageRequest): Promise<Page<ProductListItemView>> {
    const where = and(...toConditions(filters));
    const orderBy = [...ORDER_BY[filters.sort ?? 'price-asc'], asc(p.id)];

    const rows = this.db
      .select({
        product: p,
        websiteName: websitesTable.name,
        websiteLogoUrl: websitesTable.logoUrl,
      })
      .from(p)
      .innerJoin(activeRunsTable, IS_ACTIVE_RUN)
      .innerJoin(websitesTable, eq(websitesTable.id, p.websiteId))
      .where(where)
      .orderBy(...orderBy)
      .limit(page.pageSize)
      .offset((page.page - 1) * page.pageSize)
      .all();

    const total = this.db
      .select({ value: count() })
      .from(p)
      .innerJoin(activeRunsTable, IS_ACTIVE_RUN)
      .where(where)
      .get();

    return {
      items: rows.map(({ product, websiteName, websiteLogoUrl }) => ({
        key: product.productKey,
        websiteId: product.websiteId,
        websiteName,
        websiteLogoUrl,
        name: product.name,
        url: product.url,
        imageUrl: product.imageUrl,
        category: product.category,
        condition: product.condition,
        priceCents: product.priceCents,
        fullPriceCents: product.fullPriceCents,
        discountPercent: product.discountPercent,
        available: product.available,
        priceDeltaCents:
          product.previousPriceCents === null
            ? null
            : product.priceCents - product.previousPriceCents,
        collectedAt: product.collectedAt,
      })),
      total: total?.value ?? 0,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  async priceHistory(key: ProductKey): Promise<PriceHistoryPointView[]> {
    return this.db
      .select({
        priceCents: priceHistoryTable.priceCents,
        observedAt: priceHistoryTable.observedAt,
      })
      .from(priceHistoryTable)
      .where(eq(priceHistoryTable.productKey, key))
      .orderBy(asc(priceHistoryTable.observedAt))
      .all();
  }
}

function toConditions(filters: ProductFilters): (SQL | undefined)[] {
  const text = filters.text === undefined ? '' : normalizeSearchText(filters.text);
  return [
    text ? sql`instr(${p.searchName}, ${text}) > 0` : undefined,
    filters.websiteIds?.length ? inArray(p.websiteId, [...filters.websiteIds]) : undefined,
    filters.category === undefined ? undefined : eq(p.category, filters.category),
    filters.minPriceCents === undefined ? undefined : gte(p.priceCents, filters.minPriceCents),
    filters.maxPriceCents === undefined ? undefined : lte(p.priceCents, filters.maxPriceCents),
    filters.minDiscountPercent === undefined
      ? undefined
      : gte(p.discountPercent, filters.minDiscountPercent),
    filters.conditions?.length ? inArray(p.condition, [...filters.conditions]) : undefined,
    filters.onlyAvailable ? eq(p.available, true) : undefined,
    filters.onlyPriceDrops
      ? and(isNotNull(p.previousPriceCents), lt(p.priceCents, p.previousPriceCents))
      : undefined,
  ];
}
