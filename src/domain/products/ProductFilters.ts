import type { ProductCondition } from './ProductCondition';
import type { ProductSort } from './ProductSort';

export interface ProductFilters {
  text?: string;
  websiteIds?: readonly string[];
  category?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  minDiscountPercent?: number;
  conditions?: readonly ProductCondition[];
  onlyAvailable?: boolean;
  /** Só produtos cujo preço caiu em relação à busca anterior. */
  onlyPriceDrops?: boolean;
  sort?: ProductSort;
}
