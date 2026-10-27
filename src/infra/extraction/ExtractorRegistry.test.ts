import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { IProductExtractor } from '@obc/domain/extraction/IProductExtractor';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { describe, expect, it } from 'vitest';
import { ExtractorRegistry } from './ExtractorRegistry';

function fakeExtractor(key: string, handles: (url: WebsiteUrl) => boolean): IProductExtractor {
  return {
    key,
    displayName: key,
    readySelector: null,
    canHandle: handles,
    extract: () => [],
    findNextPage: () => null,
  };
}

const page: CapturedPage = { url: '', html: '', capturedAt: new Date(), pageNumber: 1 };
const pichau = fakeExtractor('pichau', (url) => url.hostname.endsWith('pichau.com.br'));
const generic = fakeExtractor('jsonld', () => true);
const registry = new ExtractorRegistry([pichau, generic]);

describe('ExtractorRegistry', () => {
  it('prefere o extrator específico do site', () => {
    expect(registry.resolve(WebsiteUrl.parse('https://www.pichau.com.br/openbox'), page)).toBe(
      pichau,
    );
  });

  it('recorre ao genérico para outros sites', () => {
    expect(registry.resolve(WebsiteUrl.parse('https://outra.com.br/openbox'), page)).toBe(generic);
  });

  it('retorna null quando nenhum extrator reconhece a página', () => {
    const onlySpecific = new ExtractorRegistry([pichau]);
    expect(onlySpecific.resolve(WebsiteUrl.parse('https://outra.com.br'), page)).toBeNull();
  });

  it('encontra o extrator pela key salva no site', () => {
    expect(registry.getByKey('jsonld')).toBe(generic);
    expect(registry.getByKey('inexistente')).toBeNull();
  });

  it('não aceita duas implementações com a mesma key', () => {
    expect(() => new ExtractorRegistry([pichau, pichau])).toThrow(/duas vezes/);
  });
});
