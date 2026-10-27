import type { ProductCondition } from './ProductCondition';
import type { ProductKey } from './ProductKey';

/** Linha da listagem de produtos (sempre da rodada ativa de cada site). */
export interface ProductListItemView {
  key: ProductKey;
  websiteId: string;
  websiteName: string;
  websiteLogoUrl: string | null;
  name: string;
  url: string;
  imageUrl: string | null;
  category: string | null;
  condition: ProductCondition;
  priceCents: number;
  fullPriceCents: number | null;
  discountPercent: number | null;
  available: boolean;
  /** Variação em relação à busca anterior: negativa quando o preço caiu. `null` = produto novo. */
  priceDeltaCents: number | null;
  collectedAt: Date;
}
