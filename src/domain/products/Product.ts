import { DomainError } from '../shared/DomainError';
import type { Money } from '../shared/Money';
import type { ProductCondition } from './ProductCondition';
import type { ProductKey } from './ProductKey';

export interface ProductProps {
  id: string;
  runId: string;
  websiteId: string;
  /** SKU ou código do produto no site, quando disponível. */
  externalId: string | null;
  name: string;
  url: string;
  imageUrl: string | null;
  category: string | null;
  condition: ProductCondition;
  /** Preço anunciado (à vista, quando o site diferencia). */
  price: Money;
  /** Preço "de", sem desconto. `null` quando o site não informa ou não há desconto. */
  fullPrice: Money | null;
  available: boolean;
  collectedAt: Date;
}

/** Oferta encontrada em uma busca. */
export class Product {
  private constructor(private readonly props: ProductProps) {}

  static create(props: ProductProps): Product {
    if (props.name.trim().length === 0) {
      throw new DomainError('product.name-required', 'O produto precisa ter um nome.');
    }
    if (props.url.trim().length === 0) {
      throw new DomainError('product.url-required', 'O produto precisa ter a URL do anúncio.');
    }

    // Um preço "de" menor ou igual ao preço atual não representa desconto
    // (dado inconsistente do site), então é descartado.
    const fullPrice =
      props.fullPrice !== null && props.fullPrice.isGreaterThan(props.price)
        ? props.fullPrice
        : null;

    return new Product({ ...props, name: props.name.trim(), fullPrice });
  }

  static restore(props: ProductProps): Product {
    return new Product({ ...props });
  }

  static keyOf(websiteId: string, externalId: string | null, url: string): ProductKey {
    return `${websiteId}:${externalId ?? url}` as ProductKey;
  }

  get key(): ProductKey {
    return Product.keyOf(this.props.websiteId, this.props.externalId, this.props.url);
  }

  get id(): string {
    return this.props.id;
  }
  get runId(): string {
    return this.props.runId;
  }
  get websiteId(): string {
    return this.props.websiteId;
  }
  get externalId(): string | null {
    return this.props.externalId;
  }
  get name(): string {
    return this.props.name;
  }
  get url(): string {
    return this.props.url;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get category(): string | null {
    return this.props.category;
  }
  get condition(): ProductCondition {
    return this.props.condition;
  }
  get price(): Money {
    return this.props.price;
  }
  get fullPrice(): Money | null {
    return this.props.fullPrice;
  }
  get available(): boolean {
    return this.props.available;
  }
  get collectedAt(): Date {
    return this.props.collectedAt;
  }

  /** Desconto em relação ao preço "de", em % inteiro arredondado para baixo (nunca exagera). */
  get discountPercent(): number | null {
    if (this.props.fullPrice === null) {
      return null;
    }
    const ratio = this.props.price.cents / this.props.fullPrice.cents;
    return Math.floor((1 - ratio) * 100);
  }
}
