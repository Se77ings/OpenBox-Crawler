import type { ProductCondition } from './ProductCondition';
import type { ProductSort } from './ProductSort';

// Os campos aceitam `undefined` explícito: um filtro ausente e um filtro `undefined`
// significam o mesmo (não filtrar), e é assim que os dados chegam da validação.
export interface ProductFilters {
  text?: string | undefined;
  websiteIds?: readonly string[] | undefined;
  category?: string | undefined;
  minPriceCents?: number | undefined;
  maxPriceCents?: number | undefined;
  minDiscountPercent?: number | undefined;
  conditions?: readonly ProductCondition[] | undefined;
  onlyAvailable?: boolean | undefined;
  /** Só produtos cujo preço caiu em relação à busca anterior. */
  onlyPriceDrops?: boolean | undefined;
  sort?: ProductSort | undefined;
}
