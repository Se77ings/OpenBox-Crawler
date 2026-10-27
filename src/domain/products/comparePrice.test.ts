import { describe, expect, it } from 'vitest';
import { Money } from '../shared/Money';
import { comparePrice } from './comparePrice';

describe('comparePrice', () => {
  const price = Money.parseBRL('R$ 4.500,00');

  it('marca como novo um produto sem histórico', () => {
    expect(comparePrice(null, price)).toEqual({ kind: 'new' });
  });

  it('detecta queda com o valor da diferença', () => {
    const change = comparePrice(Money.parseBRL('R$ 5.000,00'), price);
    expect(change.kind).toBe('dropped');
    expect(change.kind === 'dropped' && change.amount.cents).toBe(50000);
  });

  it('detecta aumento com o valor da diferença', () => {
    const change = comparePrice(Money.parseBRL('R$ 4.000,00'), price);
    expect(change.kind).toBe('raised');
    expect(change.kind === 'raised' && change.amount.cents).toBe(50000);
  });

  it('detecta preço inalterado', () => {
    expect(comparePrice(Money.parseBRL('R$ 4.500,00'), price)).toEqual({ kind: 'unchanged' });
  });
});
