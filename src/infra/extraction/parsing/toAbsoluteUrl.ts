/** Resolve um endereço relativo (`/produto/123`, `//cdn...`) a partir da página. `null` se inválido. */
export function toAbsoluteUrl(href: string | null | undefined, pageUrl: string): string | null {
  const value = href?.trim();
  if (!value || value.startsWith('data:') || value.startsWith('javascript:')) {
    return null;
  }
  try {
    return new URL(value, pageUrl).toString();
  } catch {
    return null;
  }
}
