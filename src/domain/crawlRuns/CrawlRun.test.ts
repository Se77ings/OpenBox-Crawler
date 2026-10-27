import { describe, expect, it } from 'vitest';
import { CrawlRun } from './CrawlRun';

const t0 = new Date('2026-10-27T12:00:00Z');
const later = (seconds: number): Date => new Date(t0.getTime() + seconds * 1000);
const result = { productsFound: 140, newProducts: 12, priceDrops: 5 };

function startRun(): CrawlRun {
  return CrawlRun.start({ id: 'r1', websiteId: 'w1', now: t0 });
}

function capturedRun(pages = 1): CrawlRun {
  const run = startRun();
  for (let i = 0; i < pages; i++) {
    run.registerPage({ maxPages: 20, now: later(i + 1) });
  }
  return run;
}

const INVALID_TRANSITION = { code: 'crawl-run.invalid-transition' };

describe('CrawlRun', () => {
  it('começa pendente e sem páginas', () => {
    const run = startRun();

    expect(run.status).toBe('pending');
    expect(run.pagesReceived).toBe(0);
    expect(run.isFinished).toBe(false);
    expect(run.finishedAt).toBeNull();
  });

  it('percorre o caminho feliz até concluir', () => {
    const run = capturedRun(3);
    expect(run.status).toBe('capturing');
    expect(run.pagesReceived).toBe(3);

    run.beginProcessing(later(10));
    expect(run.status).toBe('processing');

    run.complete(result, later(12));
    expect(run.status).toBe('completed');
    expect(run.productsFound).toBe(140);
    expect(run.newProducts).toBe(12);
    expect(run.priceDrops).toBe(5);
    expect(run.finishedAt).toEqual(later(12));
    expect(run.isFinished).toBe(true);
  });

  it('respeita o limite de páginas', () => {
    const run = startRun();
    run.registerPage({ maxPages: 2, now: later(1) });
    run.registerPage({ maxPages: 2, now: later(2) });

    expect(() => {
      run.registerPage({ maxPages: 2, now: later(3) });
    }).toThrow(expect.objectContaining({ code: 'crawl-run.page-limit' }));
    expect(run.pagesReceived).toBe(2);
  });

  describe('transições inválidas', () => {
    it('não processa sem nenhuma página capturada', () => {
      expect(() => {
        startRun().beginProcessing(later(1));
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
    });

    it('não conclui sem passar pelo processamento', () => {
      expect(() => {
        capturedRun().complete(result, later(5));
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
    });

    it('não recebe páginas durante o processamento', () => {
      const run = capturedRun();
      run.beginProcessing(later(5));
      expect(() => {
        run.registerPage({ maxPages: 20, now: later(6) });
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
    });

    it('não cancela durante o processamento', () => {
      const run = capturedRun();
      run.beginProcessing(later(5));
      expect(() => {
        run.cancel(later(6));
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
    });

    it('não sai de um estado final', () => {
      const run = capturedRun();
      run.cancel(later(5));

      expect(() => {
        run.fail('erro', later(6));
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
      expect(() => {
        run.registerPage({ maxPages: 20, now: later(6) });
      }).toThrow(expect.objectContaining(INVALID_TRANSITION));
    });
  });

  it.each([
    ['pendente', (): CrawlRun => startRun()],
    ['capturando', (): CrawlRun => capturedRun()],
    [
      'processando',
      (): CrawlRun => {
        const run = capturedRun();
        run.beginProcessing(later(5));
        return run;
      },
    ],
  ])('registra falha a partir de %s', (_, build) => {
    const run = build();
    run.fail('Layout da página mudou', later(30));

    expect(run.status).toBe('failed');
    expect(run.error).toBe('Layout da página mudou');
    expect(run.finishedAt).toEqual(later(30));
  });

  it.each([
    ['pendente', startRun],
    ['capturando', (): CrawlRun => capturedRun()],
  ])('pode ser cancelada enquanto %s', (_, build) => {
    const run = build();
    run.cancel(later(30));
    expect(run.status).toBe('cancelled');
  });

  describe('isStale', () => {
    const tenMinutes = 10 * 60 * 1000;

    it('detecta uma captura parada há mais tempo que o limite', () => {
      const run = capturedRun(); // última atividade em t0 + 1s
      expect(run.isStale(later(60), tenMinutes)).toBe(false);
      expect(run.isStale(later(1 + 601), tenMinutes)).toBe(true);
    });

    it('nunca considera abandonada uma rodada finalizada', () => {
      const run = capturedRun();
      run.cancel(later(2));
      expect(run.isStale(later(10_000), tenMinutes)).toBe(false);
    });
  });
});
