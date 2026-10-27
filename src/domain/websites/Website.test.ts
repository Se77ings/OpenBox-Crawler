import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import { Website } from './Website';
import { WebsiteUrl } from './WebsiteUrl';

const now = new Date('2026-10-27T12:00:00Z');

function registerPichau(extractorKey: string | null = 'pichau'): Website {
  return Website.register({
    id: 'w1',
    name: '  Pichau  ',
    openBoxUrl: WebsiteUrl.parse('https://www.pichau.com.br/openbox'),
    logoUrl: 'https://www.pichau.com.br/logo.png',
    extractorKey,
    now,
  });
}

describe('Website', () => {
  it('é cadastrado ativo, com nome limpo e sem buscas', () => {
    const website = registerPichau();

    expect(website.name).toBe('Pichau');
    expect(website.status).toBe('active');
    expect(website.baseUrl).toBe('https://www.pichau.com.br');
    expect(website.lastCrawlAt).toBeNull();
    expect(website.createdAt).toBe(now);
  });

  it.each(['', '   ', 'x'.repeat(101)])('rejeita o nome "%s"', (name) => {
    expect(() => {
      registerPichau().rename(name);
    }).toThrow(DomainError);
  });

  it('troca a URL de open box dentro do mesmo site', () => {
    const website = registerPichau();
    website.changeOpenBoxUrl(WebsiteUrl.parse('https://www.pichau.com.br/outlet'));
    expect(website.openBoxUrl.value).toBe('https://www.pichau.com.br/outlet');
  });

  it('não aceita URL de outro site', () => {
    const website = registerPichau();
    expect(() => {
      website.changeOpenBoxUrl(WebsiteUrl.parse('https://www.terabyteshop.com.br/open-box'));
    }).toThrow(expect.objectContaining({ code: 'website.host-changed' }));
  });

  describe('ensureCanCrawl', () => {
    it('libera um site ativo com extrator', () => {
      expect(() => {
        registerPichau().ensureCanCrawl();
      }).not.toThrow();
    });

    it('bloqueia um site pausado e libera ao reativar', () => {
      const website = registerPichau();
      website.pause();
      expect(() => {
        website.ensureCanCrawl();
      }).toThrow(expect.objectContaining({ code: 'website.paused' }));

      website.activate();
      expect(() => {
        website.ensureCanCrawl();
      }).not.toThrow();
    });

    it('bloqueia um site sem extrator', () => {
      expect(() => {
        registerPichau(null).ensureCanCrawl();
      }).toThrow(expect.objectContaining({ code: 'website.without-extractor' }));
    });
  });
});
