import type { ProductCondition } from '../products/ProductCondition';
import type { Money } from '../shared/Money';

/** Dados de um produto lidos do HTML, antes de virarem uma entidade `Product`. */
export interface ExtractedProduct {
  externalId: string | null;
  name: string;
  url: string;
  imageUrl: string | null;
  category: string | null;
  condition: ProductCondition;
  price: Money;
  fullPrice: Money | null;
  available: boolean;
}
