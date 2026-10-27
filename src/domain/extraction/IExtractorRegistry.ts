import type { WebsiteUrl } from '../websites/WebsiteUrl';
import type { CapturedPage } from './CapturedPage';
import type { IProductExtractor } from './IProductExtractor';

/** Escolhe o extrator: pelo conteúdo da página no cadastro, pela `key` salva na busca. */
export interface IExtractorRegistry {
  resolve(url: WebsiteUrl, page: CapturedPage): IProductExtractor | null;
  getByKey(key: string): IProductExtractor | null;
}
