import type { IProductQueries } from '@obc/domain/products/IProductQueries';
import type { ProductFilters } from '@obc/domain/products/ProductFilters';
import type { PageRequest } from '@obc/domain/shared/PageRequest';
import { describe, expect, it } from 'vitest';
import { ListProductsRequest } from './ListProductsRequest';
import { ProductQueryService } from './ProductQueryService';

function createService() {
  const calls: { filters: ProductFilters; page: PageRequest }[] = [];
  const queries: IProductQueries = {
    list: async (filters, page) => {
      calls.push({ filters, page });
      return { items: [], total: 0, ...page };
    },
    priceHistory: async () => [],
  };
  return { service: new ProductQueryService(queries), calls };
}

describe('ProductQueryService', () => {
  it('separa os filtros da paginação', async () => {
    const { service, calls } = createService();

    await service.list(ListProductsRequest.parse({ text: 'rtx', page: '3', pageSize: '10' }));

    expect(calls).toEqual([{ filters: { text: 'rtx' }, page: { page: 3, pageSize: 10 } }]);
  });

  it('recusa faixa de preço invertida', async () => {
    const { service } = createService();
    await expect(
      service.list(ListProductsRequest.parse({ minPriceCents: '5000', maxPriceCents: '1000' })),
    ).rejects.toMatchObject({ code: 'product-filters.invalid-price-range' });
  });
});
