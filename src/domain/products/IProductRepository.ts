import type { Product } from './Product';

/**
 * Ofertas por rodada. Os produtos de uma rodada só ficam visíveis depois de
 * `activateRun`, o que garante que a listagem nunca mostre uma busca pela metade.
 */
export interface IProductRepository {
  insertMany(products: readonly Product[]): Promise<void>;
  /** Torna a rodada a ativa do site e remove os produtos das rodadas anteriores. */
  activateRun(websiteId: string, runId: string): Promise<void>;
  /** Remove os produtos de uma rodada que falhou; a rodada ativa continua a mesma. */
  discardRun(runId: string): Promise<void>;
}
