/**
 * Ciclo de vida de uma busca:
 *
 *   pending ──▶ capturing ──▶ processing ──▶ completed
 *      │            │              │
 *      └──────┬─────┴──────────────┘
 *             ▼
 *    failed / cancelled (cancelar só é possível antes do processamento)
 */
export type CrawlRunStatus =
  'pending' | 'capturing' | 'processing' | 'completed' | 'failed' | 'cancelled';
