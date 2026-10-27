import { Product } from '@obc/domain/products/Product';
import { Money } from '@obc/domain/shared/Money';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UnitOfWorkFactory } from '../database/UnitOfWorkFactory';
import { createTestDatabase, type TestDatabase } from '../testing/createTestDatabase';
import { NOW } from '../testing/fixtures';

const keyA = Product.keyOf('pichau', 'A', 'https://a');
const keyB = Product.keyOf('pichau', 'B', 'https://b');
const day = (n: number): Date => new Date(NOW.getTime() + n * 86_400_000);

describe('PriceHistoryRepository', () => {
  let db: TestDatabase;
  let factory: UnitOfWorkFactory;

  beforeEach(() => {
    db = createTestDatabase();
    factory = new UnitOfWorkFactory(db.database);
  });
  afterEach(() => {
    db.dispose();
  });

  it('retorna o último preço conhecido de cada produto', async () => {
    const uow = factory.create();
    await uow.priceHistory.append([
      { productKey: keyA, price: Money.fromCents(500_00), observedAt: day(0) },
      { productKey: keyA, price: Money.fromCents(450_00), observedAt: day(2) },
      { productKey: keyA, price: Money.fromCents(480_00), observedAt: day(1) },
      { productKey: keyB, price: Money.fromCents(90_00), observedAt: day(0) },
    ]);
    await uow.commit();

    const lastPrices = await uow.priceHistory.findLastPrices([keyA, keyB]);

    expect(lastPrices.get(keyA)?.cents).toBe(450_00);
    expect(lastPrices.get(keyB)?.cents).toBe(90_00);
  });

  it('deixa fora do resultado os produtos sem histórico', async () => {
    const novo = Product.keyOf('pichau', 'NOVO', 'https://novo');
    expect((await factory.create().priceHistory.findLastPrices([novo])).has(novo)).toBe(false);
    expect((await factory.create().priceHistory.findLastPrices([])).size).toBe(0);
  });

  it('consulta em lotes quando há muitos produtos', async () => {
    const keys = Array.from({ length: 1200 }, (_, i) =>
      Product.keyOf('pichau', `SKU-${String(i)}`, `https://p/${String(i)}`),
    );
    const uow = factory.create();
    await uow.priceHistory.append(
      keys.map((productKey, i) => ({ productKey, price: Money.fromCents(i), observedAt: NOW })),
    );
    await uow.commit();

    const lastPrices = await uow.priceHistory.findLastPrices(keys);

    expect(lastPrices.size).toBe(1200);
    expect(lastPrices.get(keys[1199] ?? keyA)?.cents).toBe(1199);
  });
});
