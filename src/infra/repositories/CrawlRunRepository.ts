import { CrawlRun } from '@obc/domain/crawlRuns/CrawlRun';
import type { CrawlRunStatus } from '@obc/domain/crawlRuns/CrawlRunStatus';
import type { ICrawlRunRepository } from '@obc/domain/crawlRuns/ICrawlRunRepository';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { DbClient } from '../database/DbClient';
import type { EnqueueWrite } from '../database/PendingWrite';
import { crawlRunsTable } from '../mappings/crawlRunsTable';

type CrawlRunRow = typeof crawlRunsTable.$inferSelect;

const UNFINISHED_STATUSES: CrawlRunStatus[] = ['pending', 'capturing', 'processing'];

export class CrawlRunRepository implements ICrawlRunRepository {
  constructor(
    private readonly db: DbClient,
    private readonly enqueue: EnqueueWrite,
  ) {}

  async findById(id: string): Promise<CrawlRun | null> {
    const row = this.db.select().from(crawlRunsTable).where(eq(crawlRunsTable.id, id)).get();
    return row ? CrawlRun.restore(row) : null;
  }

  async findUnfinishedByWebsite(websiteId: string): Promise<CrawlRun | null> {
    const row = this.db
      .select()
      .from(crawlRunsTable)
      .where(
        and(
          eq(crawlRunsTable.websiteId, websiteId),
          inArray(crawlRunsTable.status, UNFINISHED_STATUSES),
        ),
      )
      .orderBy(desc(crawlRunsTable.startedAt))
      .get();
    return row ? CrawlRun.restore(row) : null;
  }

  async listUnfinished(): Promise<CrawlRun[]> {
    return this.db
      .select()
      .from(crawlRunsTable)
      .where(inArray(crawlRunsTable.status, UNFINISHED_STATUSES))
      .all()
      .map((row) => CrawlRun.restore(row));
  }

  async save(run: CrawlRun): Promise<void> {
    const row = toCrawlRunRow(run);
    this.enqueue((tx) => {
      tx.insert(crawlRunsTable)
        .values(row)
        .onConflictDoUpdate({ target: crawlRunsTable.id, set: row })
        .run();
    });
  }
}

function toCrawlRunRow(run: CrawlRun): CrawlRunRow {
  return {
    id: run.id,
    websiteId: run.websiteId,
    status: run.status,
    pagesReceived: run.pagesReceived,
    productsFound: run.productsFound,
    newProducts: run.newProducts,
    priceDrops: run.priceDrops,
    error: run.error,
    startedAt: run.startedAt,
    lastActivityAt: run.lastActivityAt,
    finishedAt: run.finishedAt,
  };
}
