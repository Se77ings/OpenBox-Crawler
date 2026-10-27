export interface CrawlOptions {
  /** Limite de páginas por busca, para não sobrecarregar o site. */
  maxPagesPerRun: number;
  /** Tempo sem receber páginas após o qual uma busca é considerada abandonada. */
  staleAfterMs: number;
  /** Por quanto tempo o HTML capturado de cada busca é mantido. */
  capturesRetentionMs: number;
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxPagesPerRun: 20,
  staleAfterMs: 10 * 60 * 1000,
  capturesRetentionMs: 30 * 24 * 60 * 60 * 1000,
};
