import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import { describe, expect, it } from 'vitest';
import { WebsiteMetadataExtractor } from './WebsiteMetadataExtractor';

const extractor = new WebsiteMetadataExtractor();

function page(head: string, url = 'https://www.pichau.com.br/openbox'): CapturedPage {
  return {
    url,
    html: `<html><head>${head}</head><body></body></html>`,
    capturedAt: new Date(),
    pageNumber: 1,
  };
}

describe('WebsiteMetadataExtractor', () => {
  describe('nome', () => {
    it('prefere o og:site_name', () => {
      const html =
        '<meta property="og:site_name" content="Pichau"><title>Open Box | Loja X</title>';
      expect(extractor.extract(page(html)).name).toBe('Pichau');
    });

    it('usa o nome da organização no JSON-LD', () => {
      const html =
        '<script type="application/ld+json">{"@type":"Organization","name":"Terabyte Shop"}</script>';
      expect(extractor.extract(page(html)).name).toBe('Terabyte Shop');
    });

    it.each([
      ['Open Box | Pichau', 'Pichau'],
      ['Ofertas Open Box - Terabyte Shop', 'Terabyte Shop'],
      ['Loja Simples', 'Loja Simples'],
    ])('extrai o nome do título "%s"', (title, name) => {
      expect(extractor.extract(page(`<title>${title}</title>`)).name).toBe(name);
    });

    it('usa o domínio quando a página não informa nada', () => {
      expect(extractor.extract(page('')).name).toBe('Pichau');
    });
  });

  describe('logo', () => {
    it('prefere o logo da organização no JSON-LD', () => {
      const html = `
        <script type="application/ld+json">{"@type":"Organization","logo":{"@type":"ImageObject","url":"/logo.svg"}}</script>
        <link rel="apple-touch-icon" href="/apple.png">`;
      expect(extractor.extract(page(html)).logoUrl).toBe('https://www.pichau.com.br/logo.svg');
    });

    it('usa o apple-touch-icon antes dos ícones comuns', () => {
      const html =
        '<link rel="icon" href="/favicon-16.png"><link rel="apple-touch-icon" href="/apple.png">';
      expect(extractor.extract(page(html)).logoUrl).toBe('https://www.pichau.com.br/apple.png');
    });

    it('escolhe o ícone de maior resolução', () => {
      const html = `
        <link rel="icon" sizes="16x16" href="/icon-16.png">
        <link rel="shortcut icon" sizes="192x192" href="/icon-192.png">
        <link rel="icon" sizes="32x32" href="/icon-32.png">`;
      expect(extractor.extract(page(html)).logoUrl).toBe('https://www.pichau.com.br/icon-192.png');
    });

    it('usa o /favicon.ico quando a página não declara ícone', () => {
      expect(extractor.extract(page('')).logoUrl).toBe('https://www.pichau.com.br/favicon.ico');
    });
  });
});
