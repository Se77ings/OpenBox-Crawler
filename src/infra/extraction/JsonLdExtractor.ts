import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { ExtractedProduct } from '@obc/domain/extraction/ExtractedProduct';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import type { PaginationAction } from '@obc/domain/extraction/PaginationAction';
import type { ProductCondition } from '@obc/domain/products/ProductCondition';
import type { Money } from '@obc/domain/shared/Money';
import type { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { load, type CheerioAPI } from 'cheerio';
import { cleanText } from './parsing/cleanText';
import { hasType, isNode, listOf, readJsonLd, textOf, type JsonLdNode } from './parsing/jsonLd';
import { parsePrice } from './parsing/parsePrice';
import { toAbsoluteUrl } from './parsing/toAbsoluteUrl';

const NEXT_PAGE_SELECTOR = 'a[rel="next"]';

/**
 * Extrator genérico para sites que publicam os produtos em JSON-LD (schema.org), como
 * muitas lojas fazem para aparecer no Google. Lê `Product` soltos, dentro de `@graph` e
 * dentro de listas (`ItemList`).
 */
export class JsonLdExtractor implements IProductExtractor {
  readonly key = 'jsonld';
  readonly displayName = 'Genérico (JSON-LD)';
  readonly readySelector = null;

  canHandle(_url: WebsiteUrl, page: CapturedPage): boolean {
    return this.extract(page).length > 0;
  }

  extract(page: CapturedPage): ExtractedProduct[] {
    const productsByUrl = new Map<string, ExtractedProduct>();
    for (const node of findProductNodes(readJsonLd(load(page.html)))) {
      const product = toExtractedProduct(node, page.url);
      if (product && !productsByUrl.has(product.url)) {
        productsByUrl.set(product.url, product);
      }
    }
    return [...productsByUrl.values()];
  }

  findNextPage(page: CapturedPage): PaginationAction | null {
    const $: CheerioAPI = load(page.html);
    return $(NEXT_PAGE_SELECTOR).length > 0
      ? { type: 'click', selector: NEXT_PAGE_SELECTOR }
      : null;
  }
}

function findProductNodes(nodes: JsonLdNode[]): JsonLdNode[] {
  const products: JsonLdNode[] = [];
  for (const node of nodes) {
    if (hasType(node, 'Product')) {
      products.push(node);
    } else if (hasType(node, 'ItemList')) {
      for (const element of listOf(node.itemListElement)) {
        // Cada elemento pode ser o próprio Product ou um ListItem que o contém em `item`.
        const candidate = isNode(element) && isNode(element.item) ? element.item : element;
        if (isNode(candidate) && hasType(candidate, 'Product')) {
          products.push(candidate);
        }
      }
    }
  }
  return products;
}

function toExtractedProduct(node: JsonLdNode, pageUrl: string): ExtractedProduct | null {
  const offers = listOf(node.offers).filter(isNode);
  const offer = offers.find((item) => readOfferPrice(item) !== null);
  const name = cleanText(textOf(node, 'name'));
  if (!offer || name.length === 0) {
    return null;
  }

  const url = toAbsoluteUrl(textOf(node, 'url') ?? textOf(offer, 'url'), pageUrl);
  const price = readOfferPrice(offer);
  if (url === null || price === null) {
    return null;
  }

  return {
    externalId: textOf(node, 'sku') ?? textOf(node, 'productID') ?? textOf(node, 'mpn'),
    name,
    url,
    imageUrl: toAbsoluteUrl(readImage(node.image), pageUrl),
    category: readCategory(node.category),
    condition: readCondition(textOf(offer, 'itemCondition') ?? textOf(node, 'itemCondition')),
    price,
    fullPrice: readListPrice(offer),
    // Sem a informação, assume-se disponível: o produto está anunciado na página.
    available: !/OutOfStock|SoldOut|Discontinued/i.test(textOf(offer, 'availability') ?? ''),
  };
}

function readOfferPrice(offer: JsonLdNode): Money | null {
  const currency = textOf(offer, 'priceCurrency');
  if (currency !== null && currency.toUpperCase() !== 'BRL') {
    return null;
  }
  // AggregateOffer (vários vendedores) informa o menor preço em `lowPrice`.
  return parsePrice(offer.price ?? offer.lowPrice);
}

/** Preço "de", quando o site o informa como especificação de preço de lista. */
function readListPrice(offer: JsonLdNode): Money | null {
  for (const spec of listOf(offer.priceSpecification).filter(isNode)) {
    if (/ListPrice|StrikethroughPrice/i.test(textOf(spec, 'priceType') ?? '')) {
      return parsePrice(spec.price);
    }
  }
  return null;
}

function readImage(value: unknown): string | null {
  const first = listOf(value)[0];
  if (typeof first === 'string') {
    return first;
  }
  return isNode(first) ? textOf(first, 'url') : null;
}

function readCategory(value: unknown): string | null {
  const category = typeof value === 'string' ? value : isNode(value) ? textOf(value, 'name') : null;
  // Categorias vêm às vezes como trilha ("Hardware > Placas de vídeo"): fica o último nível.
  const last = category?.split(/\s*[>/|]\s*/).pop();
  return last ? cleanText(last) : null;
}

/**
 * O schema.org não tem uma condição "open box". Como o extrator só é usado na página de
 * open box do site, esse é o padrão; recondicionado é a única condição que o substitui.
 */
function readCondition(value: string | null): ProductCondition {
  return value !== null && /Refurbished/i.test(value) ? 'refurbished' : 'openbox';
}
