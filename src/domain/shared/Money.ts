import { DomainError } from './DomainError';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// "1.234,56", "1234,56", "1.234", "0,9" — milhar com ponto opcional, até 2 casas decimais.
const BRL_PATTERN = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/**
 * Valor monetário em reais, armazenado sempre em centavos inteiros para evitar
 * erros de ponto flutuante (0.1 + 0.2 !== 0.3). Preços nunca são negativos.
 */
export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new DomainError('money.invalid', `Valor em centavos inválido: ${String(cents)}`);
    }
    return new Money(cents);
  }

  /** Converte textos como "R$ 1.234,56" em centavos, sem passar por ponto flutuante. */
  static parseBRL(text: string): Money {
    const normalized = text.replace(/R\$/i, '').replace(/\s/g, '');
    const match = BRL_PATTERN.exec(normalized);
    if (!match) {
      throw new DomainError('money.unparseable', `Valor em reais não reconhecido: "${text}"`);
    }

    const [, integerPart = '0', decimalPart = ''] = match;
    const reais = Number(integerPart.replaceAll('.', ''));
    const centavos = Number(decimalPart.padEnd(2, '0'));
    return Money.fromCents(reais * 100 + centavos);
  }

  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** Diferença absoluta entre os dois valores. */
  differenceTo(other: Money): Money {
    return Money.fromCents(Math.abs(this.cents - other.cents));
  }

  /** Ex.: "R$ 1.234,56". */
  format(): string {
    return BRL_FORMATTER.format(this.cents / 100);
  }
}
