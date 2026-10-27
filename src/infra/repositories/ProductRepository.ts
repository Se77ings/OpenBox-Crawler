import type { IProductRepository } from '@obc/domain/products/IProductRepository';
import type { Product } from '@obc/domain/products/Product';
import { and, eq, ne } from 'drizzle-orm';
import type { EnqueueWrite } from '../database/PendingWrite';
import { activeRunsTable } from '../mappings/activeRunsTable';
import { productsTable } from '../mappings/productsTable';
import { normalizeSearchText } from '../shared/normalizeSearchText';

// 17 colunas por produto: 500 linhas ficam bem abaixo do limite de parâmetros do SQLite.
const INSERT_BATCH_SIZE = 500;

/**
 * A troca de rodada mexe nos dois bancos (active_runs em obc.db e products em
 * offers.db). Em modo WAL, o SQLite não garante atomicidade entre bancos anexados se o
 * processo cair no meio do commit, por isso a consistência não depende disso: as
 * consultas sempre filtram pela rodada ativa, então produtos de rodadas antigas que
 * sobrarem ficam invisíveis e são apagados na próxima ativação.
 */
export class ProductRepository implements IProductRepository {
  constructor(private readonly enqueue: EnqueueWrite) {}

  async insertMany(products: readonly Product[]): Promise<void> {
    const rows = products.map(toProductRow);
    this.enqueue((tx) => {
      for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
        tx.insert(productsTable)
          .values(rows.slice(i, i + INSERT_BATCH_SIZE))
          .run();
      }
    });
  }

  async activateRun(websiteId: string, runId: string): Promise<void> {
    this.enqueue((tx) => {
      tx.insert(activeRunsTable)
        .values({ websiteId, runId })
        .onConflictDoUpdate({ target: activeRunsTable.websiteId, set: { runId } })
        .run();
      tx.delete(productsTable)
        .where(and(eq(productsTable.websiteId, websiteId), ne(productsTable.runId, runId)))
        .run();
    });
  }

  async discardRun(runId: string): Promise<void> {
    this.enqueue((tx) => {
      tx.delete(productsTable).where(eq(productsTable.runId, runId)).run();
    });
  }
}

function toProductRow(product: Product): typeof productsTable.$inferInsert {
  return {
    id: product.id,
    runId: product.runId,
    websiteId: product.websiteId,
    productKey: product.key,
    externalId: product.externalId,
    name: product.name,
    searchName: normalizeSearchText(product.name),
    url: product.url,
    imageUrl: product.imageUrl,
    category: product.category,
    condition: product.condition,
    priceCents: product.price.cents,
    fullPriceCents: product.fullPrice?.cents ?? null,
    discountPercent: product.discountPercent,
    previousPriceCents: product.previousPrice?.cents ?? null,
    available: product.available,
    collectedAt: product.collectedAt,
  };
}
