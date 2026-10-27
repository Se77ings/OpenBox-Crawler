import type { CrawlRun } from './CrawlRun';

export interface ICrawlRunRepository {
  findById(id: string): Promise<CrawlRun | null>;
  /** Rodada ainda não finalizada do site, se houver (só pode existir uma por vez). */
  findUnfinishedByWebsite(websiteId: string): Promise<CrawlRun | null>;
  /** Todas as rodadas não finalizadas, para detectar as abandonadas. */
  listUnfinished(): Promise<CrawlRun[]>;
  /** Insere ou atualiza. */
  save(run: CrawlRun): Promise<void>;
}
