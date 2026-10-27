import type { Money } from '../shared/Money';
import type { ProductKey } from './ProductKey';

export interface PriceHistoryEntry {
  productKey: ProductKey;
  price: Money;
  observedAt: Date;
}
