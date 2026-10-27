import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { describe, expect, it } from 'vitest';
import { JsonLdExtractor } from './JsonLdExtractor';

const PAGE_URL = 'https://loja.com.br/openbox';
const extractor = new JsonLdExtractor();

function pageWith(...blocks: (object | string)[]): CapturedPage {
  const scripts = blocks
    .map((block) => {
      const json = typeof block === 'string' ? block : JSON.stringify(block);
      return `<script type="application/ld+json">${json}</script>`;
    })
    .join('\n');
  return {
    url: PAGE_URL,
    html: `<html><head>${scripts}</head><body></body></html>`,
    capturedAt: new Date(),
    pageNumber: 1,
  };
}

const notebook = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: '  Notebook   Gamer  ',
  sku: 'NB-123',
  url: '/notebook-gamer',
  image: ['https://cdn.loja.com.br/nb.jpg', 'https://cdn.loja.com.br/nb-2.jpg'],
  category: 'Computadores > Notebooks',
  offers: {
    '@type': 'Offer',
    price: '4500.00',
    priceCurrency: 'BRL',
    availability: 'https://schema.org/InStock',
    priceSpecification: [
      { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/ListPrice', price: 6000 },
    ],
  },
};

describe('JsonLdExtractor', () => {
  it('lê um Product com Offer', () => {
    const [product] = extractor.extract(pageWith(notebook));

    expect({
      ...product,
      price: product?.price.cents,
      fullPrice: product?.fullPrice?.cents,
    }).toEqual({
      externalId: 'NB-123',
      name: 'Notebook Gamer',
      url: 'https://loja.com.br/notebook-gamer',
      imageUrl: 'https://cdn.loja.com.br/nb.jpg',
      category: 'Notebooks',
      condition: 'openbox',
      price: 450000,
      fullPrice: 600000,
      available: true,
    });
  });

  it('lê os produtos de uma ItemList, com ou sem ListItem', () => {
    const list = {
      '@type': 'ItemList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, item: { ...notebook, sku: 'A', url: '/a' } },
        { ...notebook, sku: 'B', url: '/b' },
      ],
    };
    expect(extractor.extract(pageWith(list)).map((p) => p.externalId)).toEqual(['A', 'B']);
  });

  it('lê os produtos dentro de @graph', () => {
    const graph = { '@graph': [{ '@type': 'WebPage' }, notebook] };
    expect(extractor.extract(pageWith(graph))).toHaveLength(1);
  });

  it('usa o menor preço de uma AggregateOffer', () => {
    const product = {
      ...notebook,
      offers: { '@type': 'AggregateOffer', lowPrice: 4200, highPrice: 4900, priceCurrency: 'BRL' },
    };
    expect(extractor.extract(pageWith(product))[0]?.price.cents).toBe(420000);
  });

  it('identifica produto esgotado e recondicionado', () => {
    const product = {
      ...notebook,
      offers: {
        ...notebook.offers,
        availability: 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/RefurbishedCondition',
      },
    };
    const [extracted] = extractor.extract(pageWith(product));
    expect(extracted?.available).toBe(false);
    expect(extracted?.condition).toBe('refurbished');
  });

  it('ignora blocos com JSON inválido sem perder os válidos', () => {
    expect(extractor.extract(pageWith('{ "@type": "Product", ', notebook))).toHaveLength(1);
  });

  it.each([
    ['sem preço', { ...notebook, offers: { '@type': 'Offer' } }],
    ['em outra moeda', { ...notebook, offers: { price: 900, priceCurrency: 'USD' } }],
    ['sem nome', { ...notebook, name: '' }],
    ['sem URL', { ...notebook, url: undefined, offers: { price: 10 } }],
  ])('descarta produto %s', (_, product) => {
    expect(extractor.extract(pageWith(product))).toEqual([]);
  });

  it('não duplica o mesmo produto publicado em dois blocos', () => {
    expect(extractor.extract(pageWith(notebook, { '@graph': [notebook] }))).toHaveLength(1);
  });

  it('só aceita a página quando encontra produtos', () => {
    const url = WebsiteUrl.parse(PAGE_URL);
    expect(extractor.canHandle(url, pageWith(notebook))).toBe(true);
    expect(extractor.canHandle(url, pageWith({ '@type': 'Organization', name: 'Loja' }))).toBe(
      false,
    );
  });

  it('pagina clicando no link rel=next do próprio site', () => {
    const page = pageWith(notebook);
    expect(extractor.findNextPage(page)).toBeNull();

    page.html = page.html.replace('<body>', '<body><a rel="next" href="/openbox/2">Próxima</a>');
    expect(extractor.findNextPage(page)).toEqual({ type: 'click', selector: 'a[rel="next"]' });
  });
});
