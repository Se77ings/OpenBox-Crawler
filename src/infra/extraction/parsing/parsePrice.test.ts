import { describe, expect, it } from 'vitest';
import { parsePrice } from './parsePrice';

describe('parsePrice', () => {
  it.each<[unknown, number]>([
    [2499.9, 249990],
    [0.29, 29],
    ['2499.90', 249990],
    ['2499.9', 249990],
    ['2499', 249900],
    ['R$ 2.499,90', 249990],
    ['2.499,90', 249990],
  ])('lê %j como %i centavos', (value, cents) => {
    expect(parsePrice(value)?.cents).toBe(cents);
  });

  it.each<unknown>([null, undefined, '', 'sob consulta', -10, Number.NaN, {}, '1,2,3'])(
    'retorna null para %j',
    (value) => {
      expect(parsePrice(value)).toBeNull();
    },
  );
});
