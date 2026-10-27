import type { Money } from '../shared/Money';

/** Variação do preço de um produto em relação à busca anterior. */
export type PriceChange =
  | { kind: 'new' }
  | { kind: 'unchanged' }
  | { kind: 'dropped'; amount: Money }
  | { kind: 'raised'; amount: Money };
