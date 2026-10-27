import type { Money } from '../shared/Money';
import type { PriceChange } from './PriceChange';

/**
 * Compara o preço atual com o último preço conhecido do produto.
 * `previous` é `null` quando o produto nunca apareceu em buscas anteriores.
 */
export function comparePrice(previous: Money | null, current: Money): PriceChange {
  if (previous === null) {
    return { kind: 'new' };
  }
  if (current.isLessThan(previous)) {
    return { kind: 'dropped', amount: current.differenceTo(previous) };
  }
  if (current.isGreaterThan(previous)) {
    return { kind: 'raised', amount: current.differenceTo(previous) };
  }
  return { kind: 'unchanged' };
}
