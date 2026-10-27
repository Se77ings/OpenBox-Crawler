import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { ExtractedProduct } from '@obc/domain/extraction/ExtractedProduct';
import { ExtractionError } from '@obc/domain/extraction/ExtractionError';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import type { PaginationAction } from '@obc/domain/extraction/PaginationAction';
import { Money } from '@obc/domain/shared/Money';
import type { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';

export interface FakeItem {
  sku: string;
  priceCents: number;
}

interface FakePageContent {
  items: FakeItem[];
  hasNext: boolean;
}

/** HTML de mentira para o extrator fake: os produtos vão serializados na própria página. */
export function fakePageHtml(items: FakeItem[], hasNext = false): string {
  return JSON.stringify({ items, hasNext } satisfies FakePageContent);
}

export const BROKEN_LAYOUT_HTML = '<html>layout novo</html>';

/** Extrator que lê os produtos de `fakePageHtml`, para testar a orquestração sem HTML real. */
export class FakeProductExtractor implements IProductExtractor {
  readonly key = 'fake';
  readonly displayName = 'Loja de teste';
  readonly readySelector = '.produtos';
  /** Executado a cada extração; permite simular efeitos durante o processamento. */
  onExtract: () => void = () => undefined;

  constructor(private readonly hostname: string) {}

  canHandle(url: WebsiteUrl): boolean {
    return url.hostname === this.hostname;
  }

  extract(page: CapturedPage): ExtractedProduct[] {
    this.onExtract();
    return read(page).items.map((item) => ({
      externalId: item.sku,
      name: `Produto ${item.sku}`,
      url: `https://${this.hostname}/${item.sku}`,
      imageUrl: null,
      category: null,
      condition: 'openbox',
      price: Money.fromCents(item.priceCents),
      fullPrice: null,
      available: true,
    }));
  }

  findNextPage(page: CapturedPage): PaginationAction | null {
    return read(page).hasNext ? { type: 'click', selector: '.proxima' } : null;
  }
}

function read(page: CapturedPage): FakePageContent {
  if (page.html === BROKEN_LAYOUT_HTML) {
    throw new ExtractionError('Layout da loja de teste mudou: grade de produtos não encontrada.');
  }
  return JSON.parse(page.html) as FakePageContent;
}
