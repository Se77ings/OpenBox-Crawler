import { describe, expect, it } from 'vitest';
import { ListProductsRequest } from './ListProductsRequest';

describe('ListProductsRequest', () => {
  it('converte os textos da query string', () => {
    const request = ListProductsRequest.parse({
      text: ' rtx 4060 ',
      websiteIds: 'pichau,terabyte',
      conditions: 'openbox,refurbished',
      minPriceCents: '100000',
      minDiscountPercent: '20',
      onlyAvailable: 'true',
      onlyPriceDrops: 'false',
      sort: 'discount-desc',
      page: '2',
    });

    expect(request).toEqual({
      text: 'rtx 4060',
      websiteIds: ['pichau', 'terabyte'],
      conditions: ['openbox', 'refurbished'],
      minPriceCents: 100000,
      minDiscountPercent: 20,
      onlyAvailable: true,
      onlyPriceDrops: false,
      sort: 'discount-desc',
      page: 2,
      pageSize: 24,
    });
  });

  it('usa a primeira página com 24 itens por padrão', () => {
    expect(ListProductsRequest.parse({})).toEqual({ page: 1, pageSize: 24 });
  });

  it.each([
    ['página zero', { page: '0' }],
    ['página grande demais', { pageSize: '500' }],
    ['desconto acima de 100%', { minDiscountPercent: '150' }],
    ['preço negativo', { minPriceCents: '-1' }],
    ['ordenação desconhecida', { sort: 'aleatorio' }],
    ['condição desconhecida', { conditions: 'usado' }],
  ])('rejeita %s', (_, query) => {
    expect(ListProductsRequest.safeParse(query).success).toBe(false);
  });
});
