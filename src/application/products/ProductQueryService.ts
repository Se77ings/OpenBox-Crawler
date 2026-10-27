import type { IProductQueries } from '@obc/domain/products/IProductQueries';
import type { PriceHistoryPointView } from '@obc/domain/products/PriceHistoryPointView';
import type { ProductFilters } from '@obc/domain/products/ProductFilters';
import type { ProductKey } from '@obc/domain/products/ProductKey';
import type { ProductListItemView } from '@obc/domain/products/ProductListItemView';
import { DomainError } from '@obc/domain/shared/DomainError';
import type { Page } from '@obc/domain/shared/Page';
import type { ListProductsRequest } from './ListProductsRequest';

export class ProductQueryService {
  constructor(private readonly productQueries: IProductQueries) {}

  async list(request: ListProductsRequest): Promise<Page<ProductListItemView>> {
    const { page, pageSize, ...filters } = request;
    if (
      filters.minPriceCents !== undefined &&
      filters.maxPriceCents !== undefined &&
      filters.minPriceCents > filters.maxPriceCents
    ) {
      throw new DomainError(
        'product-filters.invalid-price-range',
        'O preço mínimo não pode ser maior que o máximo.',
      );
    }
    return this.productQueries.list(filters satisfies ProductFilters, { page, pageSize });
  }

  async priceHistory(key: string): Promise<PriceHistoryPointView[]> {
    return this.productQueries.priceHistory(key as ProductKey);
  }
}
