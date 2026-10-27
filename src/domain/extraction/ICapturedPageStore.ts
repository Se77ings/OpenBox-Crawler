import type { CapturedPage } from './CapturedPage';

/**
 * Guarda o HTML das páginas de uma rodada até o fim da captura, quando todas são
 * processadas juntas. Manter as capturas também permite reprocessar uma busca ou
 * criar casos de teste sem abrir o site de novo.
 */
export interface ICapturedPageStore {
  save(runId: string, page: CapturedPage): Promise<void>;
  /** Páginas da rodada em ordem de `pageNumber`. */
  list(runId: string): Promise<CapturedPage[]>;
  /** Remove as capturas de rodadas anteriores a `cutoff`; retorna quantas rodadas saíram. */
  deleteOlderThan(cutoff: Date): Promise<number>;
}
