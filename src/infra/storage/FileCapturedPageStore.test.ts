import { mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileCapturedPageStore } from './FileCapturedPageStore';

function captured(pageNumber: number): CapturedPage {
  return {
    url: `https://www.pichau.com.br/openbox#${String(pageNumber)}`,
    html: `<html><body>Página ${String(pageNumber)} — ç ã é</body></html>`,
    capturedAt: new Date(Date.UTC(2026, 9, 27, 12, pageNumber)),
    pageNumber,
  };
}

describe('FileCapturedPageStore', () => {
  let dir: string;
  let store: FileCapturedPageStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'obc-captures-'));
    store = new FileCapturedPageStore(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('devolve as páginas da rodada em ordem, com o HTML intacto', async () => {
    for (const n of [3, 1, 2, 10]) {
      await store.save('run-1', captured(n));
    }
    await store.save('run-2', captured(1));

    const pages = await store.list('run-1');

    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2, 3, 10]);
    expect(pages[0]).toEqual(captured(1));
  });

  it('retorna lista vazia para uma rodada sem capturas', async () => {
    expect(await store.list('sem-capturas')).toEqual([]);
  });

  it('apaga só as capturas de rodadas antigas', async () => {
    await store.save('antiga', captured(1));
    await store.save('recente', captured(1));
    const longAgo = new Date('2026-01-01T00:00:00Z');
    utimesSync(join(dir, 'antiga'), longAgo, longAgo);

    expect(await store.deleteOlderThan(new Date('2026-06-01T00:00:00Z'))).toBe(1);
    expect(await store.list('antiga')).toEqual([]);
    expect(await store.list('recente')).toHaveLength(1);
  });

  it('não aceita um runId que tente sair da pasta de capturas', async () => {
    await expect(store.save('../fora', captured(1))).rejects.toThrow(/inválido/);
  });
});
