import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { IWebsiteMetadataExtractor } from '@obc/domain/extraction/IWebsiteMetadataExtractor';
import type { WebsiteMetadata } from '@obc/domain/extraction/WebsiteMetadata';
import { load, type CheerioAPI } from 'cheerio';
import { cleanText } from './parsing/cleanText';
import { hasType, isNode, listOf, readJsonLd, textOf, type JsonLdNode } from './parsing/jsonLd';
import { toAbsoluteUrl } from './parsing/toAbsoluteUrl';

// Separadores comuns em títulos como "Open Box | Pichau" ou "Ofertas - Terabyte Shop".
const TITLE_SEPARATORS = /\s+[|\-–—:]\s+/;

/**
 * Lê nome e logo do site para o cadastro. Cada informação tem uma ordem de fontes, da
 * mais confiável para a menos: a primeira que existir na página é usada.
 */
export class WebsiteMetadataExtractor implements IWebsiteMetadataExtractor {
  extract(page: CapturedPage): WebsiteMetadata {
    const $ = load(page.html);
    const organization = readJsonLd($).find(
      (node) => hasType(node, 'Organization') || hasType(node, 'OnlineStore'),
    );
    return {
      name: readName($, organization, page.url),
      logoUrl: readLogo($, organization, page.url),
    };
  }
}

function readName($: CheerioAPI, organization: JsonLdNode | undefined, pageUrl: string): string {
  const candidates = [
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[name="application-name"]').attr('content'),
    organization ? textOf(organization, 'name') : null,
    lastTitleSegment($('title').first().text()),
  ];
  for (const candidate of candidates) {
    const name = cleanText(candidate);
    if (name.length > 0) {
      return name;
    }
  }
  return nameFromHostname(new URL(pageUrl).hostname);
}

function readLogo(
  $: CheerioAPI,
  organization: JsonLdNode | undefined,
  pageUrl: string,
): string | null {
  const candidates = [
    organization ? readJsonLdLogo(organization) : null,
    $('link[rel="apple-touch-icon"]').attr('href'),
    largestIcon($),
    // og:image costuma ser a imagem da página (um banner ou produto), não o logo.
    $('meta[property="og:image"]').attr('content'),
  ];
  for (const candidate of candidates) {
    const url = toAbsoluteUrl(candidate, pageUrl);
    if (url !== null) {
      return url;
    }
  }
  return toAbsoluteUrl('/favicon.ico', pageUrl);
}

function readJsonLdLogo(organization: JsonLdNode): string | null {
  const logo = listOf(organization.logo)[0];
  if (typeof logo === 'string') {
    return logo;
  }
  return isNode(logo) ? textOf(logo, 'url') : null;
}

/** Entre os `<link rel="icon">`, o de maior resolução declarada em `sizes`. */
function largestIcon($: CheerioAPI): string | undefined {
  let best: { href: string; size: number } | undefined;
  $('link[rel~="icon"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) {
      return;
    }
    const size = Number(/(\d+)x\d+/.exec($(element).attr('sizes') ?? '')?.[1] ?? 0);
    if (!best || size > best.size) {
      best = { href, size };
    }
  });
  return best?.href;
}

function lastTitleSegment(title: string): string {
  return title.split(TITLE_SEPARATORS).pop() ?? '';
}

/** "www.pichau.com.br" → "Pichau". */
function nameFromHostname(hostname: string): string {
  const label = hostname.replace(/^www\./, '').split('.')[0] ?? hostname;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
