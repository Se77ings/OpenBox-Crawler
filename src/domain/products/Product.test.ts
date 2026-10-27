import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import { Money } from '../shared/Money';
import { Product, type ProductProps } from './Product';

const baseProps: ProductProps = {
  id: 'p1',
  runId: 'r1',
  websiteId: 'w1',
  externalId: 'SKU-123',
  name: 'Notebook Gamer',
  url: 'https://www.pichau.com.br/notebook-gamer',
  imageUrl: null,
  category: 'Notebooks',
  condition: 'openbox',
  price: Money.parseBRL('R$ 4.500,00'),
  fullPrice: Money.parseBRL('R$ 6.000,00'),
  previousPrice: null,
  available: true,
  collectedAt: new Date('2026-10-27T12:00:00Z'),
};

describe('Product', () => {
  it('calcula o desconto em relação ao preço "de"', () => {
    expect(Product.create(baseProps).discountPercent).toBe(25);
  });

  it('arredonda o desconto para baixo, sem exagerar a oferta', () => {
    const product = Product.create({
      ...baseProps,
      price: Money.fromCents(6667),
      fullPrice: Money.fromCents(10000),
    });
    expect(product.discountPercent).toBe(33); // 33,33% → 33
  });

  it.each([
    [200000, 250000, 20],
    [70000, 100000, 30],
    [57000, 100000, 43],
  ])('não sofre erro de ponto flutuante (%i de %i = %i%%)', (price, fullPrice, percent) => {
    const product = Product.create({
      ...baseProps,
      price: Money.fromCents(price),
      fullPrice: Money.fromCents(fullPrice),
    });
    expect(product.discountPercent).toBe(percent);
  });

  it('não tem desconto quando o site não informa o preço "de"', () => {
    expect(Product.create({ ...baseProps, fullPrice: null }).discountPercent).toBeNull();
  });

  it.each([
    ['igual', 'R$ 4.500,00'],
    ['menor', 'R$ 4.000,00'],
  ])('descarta um preço "de" %s ao preço atual', (_, fullPrice) => {
    const product = Product.create({ ...baseProps, fullPrice: Money.parseBRL(fullPrice) });
    expect(product.fullPrice).toBeNull();
    expect(product.discountPercent).toBeNull();
  });

  it.each([
    ['name', '   '],
    ['url', ''],
  ])('exige o campo %s', (field, value) => {
    expect(() => Product.create({ ...baseProps, [field]: value })).toThrow(DomainError);
  });

  describe('priceChange', () => {
    it('é novo quando não há preço anterior', () => {
      expect(Product.create(baseProps).priceChange).toEqual({ kind: 'new' });
    });

    it('compara com o preço da busca anterior', () => {
      const product = Product.create({
        ...baseProps,
        previousPrice: Money.parseBRL('R$ 4.800,00'),
      });
      const change = product.priceChange;
      expect(change.kind === 'dropped' && change.amount.cents).toBe(30000);
    });
  });

  describe('key', () => {
    it('usa o código do produto no site quando existe', () => {
      expect(Product.create(baseProps).key).toBe('w1:SKU-123');
    });

    it('usa a URL do anúncio quando não há código', () => {
      expect(Product.create({ ...baseProps, externalId: null }).key).toBe(
        'w1:https://www.pichau.com.br/notebook-gamer',
      );
    });
  });
});
