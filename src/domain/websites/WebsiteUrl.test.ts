import { describe, expect, it } from 'vitest';
import { DomainError } from '../shared/DomainError';
import { WebsiteUrl } from './WebsiteUrl';

describe('WebsiteUrl', () => {
  it('remove os parâmetros de rastreamento de anúncio da URL da Terabyte', () => {
    const url = WebsiteUrl.parse(
      'https://www.terabyteshop.com.br/open-box?gad_source=1&gad_campaignid=22104515472&gclid=CjwKCAjwl4HXBhAjEiwAHlpWhEZUQhUhUbVxwsnw1ySne5-AWufubKUcpt0qWNfmBtuJo1IE76CEuRoCJQoQAvD_BwE',
    );

    expect(url.value).toBe('https://www.terabyteshop.com.br/open-box');
    expect(url.baseUrl).toBe('https://www.terabyteshop.com.br');
    expect(url.hostname).toBe('www.terabyteshop.com.br');
  });

  it('mantém a URL da Pichau, que já está limpa', () => {
    expect(WebsiteUrl.parse('https://www.pichau.com.br/openbox').value).toBe(
      'https://www.pichau.com.br/openbox',
    );
  });

  it.each([
    ['https://www.pichau.com.br/openbox/', 'barra final'],
    ['https://www.pichau.com.br/openbox#topo', 'fragmento'],
    ['https://www.pichau.com.br/openbox?utm_source=x&utm_medium=y', 'utm'],
    ['http://www.pichau.com.br/openbox', 'http'],
    ['HTTPS://WWW.PICHAU.COM.BR/openbox', 'host em maiúsculas'],
    ['https://www.pichau.com.br:443/openbox', 'porta padrão'],
    ['www.pichau.com.br/openbox', 'sem protocolo'],
    ['  https://www.pichau.com.br/openbox  ', 'espaços'],
  ])('normaliza %s (%s)', (input) => {
    expect(WebsiteUrl.parse(input).value).toBe('https://www.pichau.com.br/openbox');
  });

  it('não altera a caixa do caminho', () => {
    expect(WebsiteUrl.parse('https://loja.com.br/Open-Box').value).toBe(
      'https://loja.com.br/Open-Box',
    );
  });

  it('aceita a raiz do site', () => {
    const url = WebsiteUrl.parse('https://loja.com.br/');
    expect(url.value).toBe('https://loja.com.br');
    expect(url.baseUrl).toBe('https://loja.com.br');
  });

  it('mantém http em hosts locais, usados no desenvolvimento', () => {
    expect(WebsiteUrl.parse('http://localhost:3000/teste/openbox').value).toBe(
      'http://localhost:3000/teste/openbox',
    );
  });

  it.each(['', 'nao é url', 'ftp://loja.com.br/openbox', 'https://intranet/openbox'])(
    'rejeita "%s"',
    (input) => {
      expect(() => WebsiteUrl.parse(input)).toThrow(DomainError);
    },
  );

  it('identifica páginas do mesmo host', () => {
    const url = WebsiteUrl.parse('https://www.pichau.com.br/openbox');

    expect(url.isSameHostAs('https://www.pichau.com.br/openbox?page=2')).toBe(true);
    expect(url.isSameHostAs('https://www.terabyteshop.com.br/open-box')).toBe(false);
    expect(url.isSameHostAs('não é url')).toBe(false);
  });

  it('considera iguais URLs que normalizam para o mesmo valor', () => {
    const a = WebsiteUrl.parse('https://www.pichau.com.br/openbox?gclid=1');
    const b = WebsiteUrl.parse('www.pichau.com.br/openbox/');
    expect(a.equals(b)).toBe(true);
  });
});
