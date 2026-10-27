import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApplication,
  STORE_URL,
  type TestApplication,
} from '../testing/createTestApplication';

const register = (t: TestApplication, overrides: { extractorKey?: string | null } = {}) =>
  t.app.websites.register({
    openBoxUrl: STORE_URL,
    name: 'Loja',
    logoUrl: null,
    extractorKey: 'fake',
    ...overrides,
  });

describe('WebsiteService', () => {
  let t: TestApplication;

  beforeEach(() => {
    t = createTestApplication();
  });

  describe('preview', () => {
    it('identifica o site e o extrator sem salvar nada', async () => {
      const preview = await t.app.websites.preview({
        url: `${STORE_URL}?gclid=abc&utm_source=google`,
        html: '<html></html>',
      });

      expect(preview).toEqual({
        openBoxUrl: STORE_URL,
        baseUrl: 'https://www.loja.com.br',
        name: 'Loja de Teste',
        logoUrl: null,
        extractor: { key: 'fake', displayName: 'Loja de teste' },
        alreadyRegistered: null,
      });
      expect(t.db.websites.size).toBe(0);
    });

    it('avisa quando nenhum extrator reconhece o site', async () => {
      const preview = await t.app.websites.preview({ url: 'https://outra.com.br', html: '<p/>' });
      expect(preview.extractor).toBeNull();
    });

    it('avisa quando o site já está cadastrado', async () => {
      const { id } = await register(t);
      const preview = await t.app.websites.preview({ url: STORE_URL, html: '<p/>' });
      expect(preview.alreadyRegistered).toEqual({ id, name: 'Loja' });
    });
  });

  describe('register', () => {
    it('cadastra o site ativo', async () => {
      const website = await register(t);
      expect(website).toMatchObject({
        name: 'Loja',
        openBoxUrl: STORE_URL,
        status: 'active',
        extractorKey: 'fake',
      });
      expect(t.db.websites.has(website.id)).toBe(true);
    });

    it('permite cadastrar sem extrator', async () => {
      expect((await register(t, { extractorKey: null })).extractorKey).toBeNull();
    });

    it('recusa site duplicado', async () => {
      await register(t);
      await expect(register(t)).rejects.toMatchObject({ code: 'website.already-registered' });
    });

    it('recusa extrator desconhecido', async () => {
      await expect(register(t, { extractorKey: 'inventado' })).rejects.toMatchObject({
        code: 'website.unknown-extractor',
      });
    });
  });

  describe('update', () => {
    it('renomeia, troca a URL no mesmo site e pausa', async () => {
      const { id } = await register(t);

      const updated = await t.app.websites.update(id, {
        name: 'Loja Nova',
        openBoxUrl: 'https://www.loja.com.br/outlet',
        status: 'paused',
      });

      expect(updated).toMatchObject({
        name: 'Loja Nova',
        openBoxUrl: 'https://www.loja.com.br/outlet',
        status: 'paused',
      });
      expect(t.db.websites.get(id)?.name).toBe('Loja Nova');
    });

    it('recusa URL de outro site', async () => {
      const { id } = await register(t);
      await expect(
        t.app.websites.update(id, { openBoxUrl: 'https://outra.com.br/openbox' }),
      ).rejects.toMatchObject({ code: 'website.host-changed' });
    });

    it('recusa site inexistente', async () => {
      await expect(t.app.websites.update('x', { name: 'Y' })).rejects.toMatchObject({
        code: 'website.not-found',
      });
    });
  });

  it('remove o site', async () => {
    const { id } = await register(t);
    await t.app.websites.remove(id);
    expect(t.db.websites.has(id)).toBe(false);
  });
});
