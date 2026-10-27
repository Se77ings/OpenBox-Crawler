import type { Page } from '../shared/Page';
import type { PageRequest } from '../shared/PageRequest';
import type { PriceHistoryPointView } from './PriceHistoryPointView';
import type { ProductFilters } from './ProductFilters';
import type { ProductKey } from './ProductKey';
import type { ProductListItemView } from './ProductListItemView';

export interface IProductQueries {
  list(filters: ProductFilters, page: PageRequest): Promise<Page<ProductListItemView>>;
  priceHistory(key: ProductKey): Promise<PriceHistoryPointView[]>;
}
