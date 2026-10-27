import { Money } from '@obc/domain/shared/Money';

const DECIMAL_PATTERN = /^\d+(?:\.\d{1,2})?$/;

/**
 * Lê um preço nos formatos encontrados nas páginas: número (`2499.9`), texto decimal
 * (`"2499.90"`, padrão do schema.org) ou texto em reais (`"R$ 2.499,90"`).
 * Retorna `null` quando não há preço utilizável.
 */
export function parsePrice(value: unknown): Money | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Money.fromCents(Math.round(value * 100)) : null;
  }
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  if (DECIMAL_PATTERN.test(text)) {
    const [reais = '0', centavos = ''] = text.split('.');
    return Money.fromCents(Number(reais) * 100 + Number(centavos.padEnd(2, '0')));
  }
  try {
    return Money.parseBRL(text);
  } catch {
    return null;
  }
}
