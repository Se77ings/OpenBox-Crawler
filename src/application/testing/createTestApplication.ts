import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { ICapturedPageStore } from '@obc/domain/extraction/ICapturedPageStore';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import type { IClock } from '@obc/domain/shared/IClock';
import type { WebsiteListItemView } from '@obc/domain/websites/WebsiteListItemView';
import { createApplication, type Application } from '../createApplication';
import { FakeProductExtractor } from './FakeProductExtractor';
import { InMemoryDatabase } from './InMemoryDatabase';

export const STORE_HOST = 'www.loja.com.br';
export const STORE_URL = `https://${STORE_HOST}/openbox`;

export class FakeClock implements IClock {
  constructor(private current = new Date('2026-10-27T12:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}

export class InMemoryCapturedPageStore implements ICapturedPageStore {
  readonly pagesByRun = new Map<string, CapturedPage[]>();
  lastCleanupCutoff: Date | null = null;

  async save(runId: string, page: CapturedPage): Promise<void> {
    this.pagesByRun.set(runId, [...(this.pagesByRun.get(runId) ?? []), page]);
  }

  async list(runId: string): Promise<CapturedPage[]> {
    return [...(this.pagesByRun.get(runId) ?? [])];
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    this.lastCleanupCutoff = cutoff;
    return 0;
  }
}

export interface TestApplication {
  app: Application;
  db: InMemoryDatabase;
  clock: FakeClock;
  extractor: FakeProductExtractor;
  capturedPages: InMemoryCapturedPageStore;
}

/** Application completa sobre fakes em memória, com uma loja de teste reconhecida. */
export function createTestApplication(): TestApplication {
  const db = new InMemoryDatabase();
  const clock = new FakeClock();
  const extractor = new FakeProductExtractor(STORE_HOST);
  const capturedPages = new InMemoryCapturedPageStore();
  const extractors: IProductExtractor[] = [extractor];
  let nextId = 0;

  const app = createApplication({
    unitOfWork: db,
    websiteQueries: { listWithStats: async (): Promise<WebsiteListItemView[]> => [] },
    productQueries: {
      list: async (_, page) => ({ items: [], total: 0, ...page }),
      priceHistory: async () => [],
    },
    extractors: {
      resolve: (url, page) => extractors.find((e) => e.canHandle(url, page)) ?? null,
      getByKey: (key) => extractors.find((e) => e.key === key) ?? null,
    },
    metadataExtractor: { extract: () => ({ name: 'Loja de Teste', logoUrl: null }) },
    capturedPages,
    ids: { next: () => `id-${String(++nextId)}` },
    clock,
    crawlOptions: { maxPagesPerRun: 3 },
  });

  return { app, db, clock, extractor, capturedPages };
}
