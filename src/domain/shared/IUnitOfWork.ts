import type { ICrawlRunRepository } from '../crawlRuns/ICrawlRunRepository';
import type { IPriceHistoryRepository } from '../products/IPriceHistoryRepository';
import type { IProductRepository } from '../products/IProductRepository';
import type { IWebsiteRepository } from '../websites/IWebsiteRepository';

/**
 * Agrupa as alterações de uma operação para gravá-las de uma só vez. As escritas dos
 * repositórios ficam pendentes até o `commit`, que aplica todas numa única transação:
 * ou tudo é gravado, ou nada é. As leituras consultam o banco na hora e, portanto, não
 * enxergam as escritas ainda pendentes.
 */
export interface IUnitOfWork {
  readonly websites: IWebsiteRepository;
  readonly crawlRuns: ICrawlRunRepository;
  readonly products: IProductRepository;
  readonly priceHistory: IPriceHistoryRepository;

  commit(): Promise<void>;
}
