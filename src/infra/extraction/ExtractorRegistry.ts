import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { IExtractorRegistry } from '@obc/domain/extraction/IExtractorRegistry';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import type { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';

/**
 * Reúne os extratores disponíveis. A ordem de registro é a ordem de preferência no
 * cadastro: os extratores específicos de cada site vêm antes dos genéricos.
 */
export class ExtractorRegistry implements IExtractorRegistry {
  private readonly byKey: ReadonlyMap<string, IProductExtractor>;

  constructor(private readonly extractors: readonly IProductExtractor[]) {
    const byKey = new Map<string, IProductExtractor>();
    for (const extractor of extractors) {
      if (byKey.has(extractor.key)) {
        throw new Error(`Extrator registrado duas vezes: "${extractor.key}"`);
      }
      byKey.set(extractor.key, extractor);
    }
    this.byKey = byKey;
  }

  resolve(url: WebsiteUrl, page: CapturedPage): IProductExtractor | null {
    return this.extractors.find((extractor) => extractor.canHandle(url, page)) ?? null;
  }

  getByKey(key: string): IProductExtractor | null {
    return this.byKey.get(key) ?? null;
  }
}
