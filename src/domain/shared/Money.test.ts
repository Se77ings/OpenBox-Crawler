import { describe, expect, it } from 'vitest';
import { DomainError } from './DomainError';
import { Money } from './Money';

describe('Money', () => {
  describe('parseBRL', () => {
    it.each([
      ['R$ 1.234,56', 123456],
      ['R$1.234,56', 123456],
      ['1234,56', 123456],
      ['R$ 1.234', 123400],
      ['R$ 12.345.678,90', 1234567890],
      ['R$ 0,99', 99],
      ['R$ 10,5', 1050],
      ['  R$ 2.499,00  ', 249900],
      ['R$ 3.199,90', 319990], // espaço não separável, comum no HTML das lojas
      ['r$ 50', 5000],
    ])('converte "%s" em %i centavos', (text, cents) => {
      expect(Money.parseBRL(text).cents).toBe(cents);
    });

    it('não sofre erro de ponto flutuante', () => {
      // 0,29 * 100 em float dá 28.999999999999996
      expect(Money.parseBRL('R$ 0,29').cents).toBe(29);
      expect(Money.parseBRL('R$ 1.111,11').cents).toBe(111111);
    });

    it.each(['', 'R$', 'abc', 'R$ 1.23,45', 'R$ 1,234', 'R$ -10,00', 'R$ 10.00', 'US$ 10'])(
      'rejeita "%s"',
      (text) => {
        expect(() => Money.parseBRL(text)).toThrow(DomainError);
      },
    );
  });

  describe('fromCents', () => {
    it('aceita zero e inteiros positivos', () => {
      expect(Money.fromCents(0).cents).toBe(0);
      expect(Money.fromCents(150).cents).toBe(150);
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejeita %s', (cents) => {
      expect(() => Money.fromCents(cents)).toThrow(DomainError);
    });
  });

  it('compara valores', () => {
    const cheap = Money.fromCents(100);
    const expensive = Money.fromCents(200);

    expect(cheap.isLessThan(expensive)).toBe(true);
    expect(expensive.isGreaterThan(cheap)).toBe(true);
    expect(cheap.equals(Money.fromCents(100))).toBe(true);
    expect(cheap.differenceTo(expensive).cents).toBe(100);
    expect(expensive.differenceTo(cheap).cents).toBe(100);
  });

  it('formata em reais', () => {
    // O Intl usa espaço não separável entre "R$" e o número.
    expect(Money.fromCents(123456).format().replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(Money.fromCents(5).format().replace(/\s/g, ' ')).toBe('R$ 0,05');
  });
});
