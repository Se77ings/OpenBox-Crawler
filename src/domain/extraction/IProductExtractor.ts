import type { WebsiteUrl } from '../websites/WebsiteUrl';
import type { CapturedPage } from './CapturedPage';
import type { ExtractedProduct } from './ExtractedProduct';
import type { PaginationAction } from './PaginationAction';

/**
 * Lê os produtos da página de open box de um site. Existe uma implementação por site
 * (Pichau, Terabyte) e uma genérica (JSON-LD); o site cadastrado guarda a `key` da
 * implementação escolhida.
 */
export interface IProductExtractor {
  readonly key: string;
  /** Nome exibido no cadastro. Ex.: "Pichau", "Genérico (JSON-LD)". */
  readonly displayName: string;
  /** Seletor que indica para a extensão que os produtos já foram renderizados. */
  readonly readySelector: string | null;

  canHandle(url: WebsiteUrl, page: CapturedPage): boolean;
  extract(page: CapturedPage): ExtractedProduct[];
  /** `null` quando não há mais produtos a carregar. */
  findNextPage(page: CapturedPage): PaginationAction | null;
}
