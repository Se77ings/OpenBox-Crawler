import type { IPriceHistoryRepository } from '@obc/domain/products/IPriceHistoryRepository';
import type { PriceHistoryEntry } from '@obc/domain/products/PriceHistoryEntry';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import { Money } from '@obc/domain/shared/Money';
import { and, eq, inArray, max, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { DbClient } from '../database/DbClient';
import type { EnqueueWrite } from '../database/PendingWrite';
import { priceHistoryTable } from '../mappings/priceHistoryTable';

const BATCH_SIZE = 500;

export class PriceHistoryRepository implements IPriceHistoryRepository {
  constructor(
    private readonly db: DbClient,
    private readonly enqueue: EnqueueWrite,
  ) {}

  async findLastPrices(keys: readonly ProductKey[]): Promise<Map<ProductKey, Money>> {
    const lastPrices = new Map<ProductKey, Money>();
    const latest = alias(priceHistoryTable, 'latest');

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      const lastObservedAt = this.db
        .select({ value: max(latest.observedAt) })
        .from(latest)
        .where(eq(latest.productKey, priceHistoryTable.productKey));

      const rows = this.db
        .select({
          productKey: priceHistoryTable.productKey,
          priceCents: priceHistoryTable.priceCents,
        })
        .from(priceHistoryTable)
        .where(
          and(
            inArray(priceHistoryTable.productKey, batch),
            sql`${priceHistoryTable.observedAt} = (${lastObservedAt})`,
          ),
        )
        .all();

      for (const row of rows) {
        lastPrices.set(row.productKey, Money.fromCents(row.priceCents));
      }
    }
    return lastPrices;
  }

  async append(entries: readonly PriceHistoryEntry[]): Promise<void> {
    const rows = entries.map((entry) => ({
      productKey: entry.productKey,
      priceCents: entry.price.cents,
      observedAt: entry.observedAt,
    }));
    this.enqueue((tx) => {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        tx.insert(priceHistoryTable)
          .values(rows.slice(i, i + BATCH_SIZE))
          .run();
      }
    });
  }
}
