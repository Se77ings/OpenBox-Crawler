import type { Website } from './Website';

export interface IWebsiteRepository {
  findById(id: string): Promise<Website | null>;
  /** Usado para impedir o cadastro duplicado de um mesmo site. */
  findByBaseUrl(baseUrl: string): Promise<Website | null>;
  /** Insere ou atualiza. */
  save(website: Website): Promise<void>;
  remove(id: string): Promise<void>;
}
