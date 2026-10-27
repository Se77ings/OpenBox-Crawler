import { DomainError } from '../shared/DomainError';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/**
 * URL da página de open box de um site, normalizada para servir de identidade:
 * - remove query string e fragmento (parâmetros de rastreamento como gclid, utm_*);
 * - força https (exceto em hosts locais, usados no desenvolvimento);
 * - host em minúsculas, sem porta padrão e sem barra final.
 */
export class WebsiteUrl {
  private constructor(
    /** URL completa normalizada. Ex.: https://www.pichau.com.br/openbox */
    readonly value: string,
    /** Origem do site. Ex.: https://www.pichau.com.br */
    readonly baseUrl: string,
    readonly hostname: string,
  ) {}

  static parse(input: string): WebsiteUrl {
    const trimmed = input.trim();
    const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      throw new DomainError('website-url.invalid', `URL inválida: "${input}"`);
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new DomainError('website-url.invalid', `A URL precisa ser http ou https: "${input}"`);
    }
    if (!url.hostname.includes('.') && !LOCAL_HOSTS.has(url.hostname)) {
      throw new DomainError('website-url.invalid', `Domínio inválido: "${input}"`);
    }

    if (!LOCAL_HOSTS.has(url.hostname)) {
      url.protocol = 'https:';
    }
    url.search = '';
    url.hash = '';

    const value = url.toString().replace(/\/+$/, '');
    return new WebsiteUrl(value, url.origin, url.hostname);
  }

  /** Indica se `rawUrl` pertence ao mesmo host (usado para validar páginas capturadas). */
  isSameHostAs(rawUrl: string): boolean {
    try {
      return new URL(rawUrl).hostname === this.hostname;
    } catch {
      return false;
    }
  }

  equals(other: WebsiteUrl): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
