import type { Money } from '../shared/Money';
import type { PriceHistoryEntry } from './PriceHistoryEntry';
import type { ProductKey } from './ProductKey';

/** Histórico de preços, mantido entre as buscas (nunca é apagado). */
export interface IPriceHistoryRepository {
  /** Último preço conhecido de cada produto informado; produtos novos ficam fora do mapa. */
  findLastPrices(keys: readonly ProductKey[]): Promise<Map<ProductKey, Money>>;
  append(entries: readonly PriceHistoryEntry[]): Promise<void>;
}
