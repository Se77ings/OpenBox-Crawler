import type { CheerioAPI } from 'cheerio';

export type JsonLdNode = Record<string, unknown>;

/**
 * Lê todos os blocos `<script type="application/ld+json">` da página e devolve os nós
 * planificados: arrays e `@graph` são desmembrados. Blocos com JSON inválido, comuns em
 * páginas reais, são ignorados.
 */
export function readJsonLd($: CheerioAPI): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(element).text());
    } catch {
      return;
    }
    collect(parsed, nodes);
  });

  return nodes;
}

function collect(value: unknown, into: JsonLdNode[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collect(item, into);
    }
    return;
  }
  if (!isNode(value)) {
    return;
  }
  into.push(value);
  if ('@graph' in value) {
    collect(value['@graph'], into);
  }
}

export function isNode(value: unknown): value is JsonLdNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `@type` pode ser texto ou lista: `"Product"` ou `["Product", "IndividualProduct"]`. */
export function hasType(node: JsonLdNode, type: string): boolean {
  const value = node['@type'];
  return Array.isArray(value) ? value.includes(type) : value === type;
}

/** Valor de texto de uma propriedade, ou `null` se ausente ou de outro tipo. */
export function textOf(node: JsonLdNode, key: string): string | null {
  const value = node[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

/** Normaliza uma propriedade que pode ser um item ou uma lista de itens. */
export function listOf(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
