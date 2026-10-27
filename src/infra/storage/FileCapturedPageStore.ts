import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CapturedPage } from '@obc/domain/extraction/CapturedPage';
import type { ICapturedPageStore } from '@obc/domain/extraction/ICapturedPageStore';

interface PageMetadata {
  url: string;
  capturedAt: string;
  pageNumber: number;
}

/**
 * Grava cada página em `<pasta>/<runId>/page-<n>.html`, com os dados da captura ao lado
 * em `page-<n>.json`. O HTML fica num arquivo próprio para poder ser aberto no navegador
 * ou copiado como caso de teste.
 */
export class FileCapturedPageStore implements ICapturedPageStore {
  constructor(private readonly capturesDir: string) {}

  async save(runId: string, page: CapturedPage): Promise<void> {
    const runDir = this.runDir(runId);
    await mkdir(runDir, { recursive: true });

    const metadata: PageMetadata = {
      url: page.url,
      capturedAt: page.capturedAt.toISOString(),
      pageNumber: page.pageNumber,
    };
    await writeFile(join(runDir, `page-${String(page.pageNumber)}.html`), page.html, 'utf8');
    await writeFile(join(runDir, `page-${String(page.pageNumber)}.json`), JSON.stringify(metadata));
  }

  async list(runId: string): Promise<CapturedPage[]> {
    const runDir = this.runDir(runId);
    let files: string[];
    try {
      files = await readdir(runDir);
    } catch {
      return [];
    }

    const pages = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file): Promise<CapturedPage> => {
          const metadata = JSON.parse(await readFile(join(runDir, file), 'utf8')) as PageMetadata;
          const html = await readFile(join(runDir, file.replace(/\.json$/, '.html')), 'utf8');
          return {
            url: metadata.url,
            html,
            capturedAt: new Date(metadata.capturedAt),
            pageNumber: metadata.pageNumber,
          };
        }),
    );
    return pages.sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    let runIds: string[];
    try {
      runIds = await readdir(this.capturesDir);
    } catch {
      return 0;
    }

    let deleted = 0;
    for (const runId of runIds) {
      const runDir = this.runDir(runId);
      if ((await stat(runDir)).mtime < cutoff) {
        await rm(runDir, { recursive: true, force: true });
        deleted += 1;
      }
    }
    return deleted;
  }

  private runDir(runId: string): string {
    // O runId vem da API: impede que um valor como "../" escape da pasta de capturas.
    if (!/^[\w-]+$/.test(runId)) {
      throw new Error(`Identificador de rodada inválido: "${runId}"`);
    }
    return join(this.capturesDir, runId);
  }
}
