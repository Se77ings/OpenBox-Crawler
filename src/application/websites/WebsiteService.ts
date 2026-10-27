import type { IExtractorRegistry } from '@obc/domain/extraction/IExtractorRegistry';
import type { IWebsiteMetadataExtractor } from '@obc/domain/extraction/IWebsiteMetadataExtractor';
import { DomainError } from '@obc/domain/shared/DomainError';
import type { IClock } from '@obc/domain/shared/IClock';
import type { IIdGenerator } from '@obc/domain/shared/IIdGenerator';
import type { IUnitOfWorkFactory } from '@obc/domain/shared/IUnitOfWorkFactory';
import type { IWebsiteQueries } from '@obc/domain/websites/IWebsiteQueries';
import { Website } from '@obc/domain/websites/Website';
import type { WebsiteListItemView } from '@obc/domain/websites/WebsiteListItemView';
import { WebsiteUrl } from '@obc/domain/websites/WebsiteUrl';
import { NotFoundError } from '../shared/NotFoundError';
import type { PreviewWebsiteRequest } from './PreviewWebsiteRequest';
import type { RegisterWebsiteRequest } from './RegisterWebsiteRequest';
import type { UpdateWebsiteRequest } from './UpdateWebsiteRequest';
import type { WebsitePreviewResponse } from './WebsitePreviewResponse';
import { toWebsiteResponse, type WebsiteResponse } from './WebsiteResponse';

export interface WebsiteServiceDependencies {
  unitOfWork: IUnitOfWorkFactory;
  websiteQueries: IWebsiteQueries;
  extractors: IExtractorRegistry;
  metadataExtractor: IWebsiteMetadataExtractor;
  ids: IIdGenerator;
  clock: IClock;
}

export class WebsiteService {
  constructor(private readonly deps: WebsiteServiceDependencies) {}

  /** Identifica o site a partir da página capturada, sem salvar nada. */
  async preview(request: PreviewWebsiteRequest): Promise<WebsitePreviewResponse> {
    const url = WebsiteUrl.parse(request.url);
    const page = {
      url: request.url,
      html: request.html,
      capturedAt: this.deps.clock.now(),
      pageNumber: 1,
    };

    const metadata = this.deps.metadataExtractor.extract(page);
    const extractor = this.deps.extractors.resolve(url, page);
    const existing = await this.deps.unitOfWork.create().websites.findByBaseUrl(url.baseUrl);

    return {
      openBoxUrl: url.value,
      baseUrl: url.baseUrl,
      name: metadata.name ?? url.hostname,
      logoUrl: metadata.logoUrl,
      extractor: extractor ? { key: extractor.key, displayName: extractor.displayName } : null,
      alreadyRegistered: existing ? { id: existing.id, name: existing.name } : null,
    };
  }

  async register(request: RegisterWebsiteRequest): Promise<WebsiteResponse> {
    const url = WebsiteUrl.parse(request.openBoxUrl);
    if (
      request.extractorKey !== null &&
      this.deps.extractors.getByKey(request.extractorKey) === null
    ) {
      throw new DomainError(
        'website.unknown-extractor',
        `Extrator desconhecido: "${request.extractorKey}"`,
      );
    }

    const uow = this.deps.unitOfWork.create();
    const existing = await uow.websites.findByBaseUrl(url.baseUrl);
    if (existing) {
      throw new DomainError(
        'website.already-registered',
        `O site "${existing.name}" já está cadastrado.`,
      );
    }

    const website = Website.register({
      id: this.deps.ids.next(),
      name: request.name,
      openBoxUrl: url,
      logoUrl: request.logoUrl,
      extractorKey: request.extractorKey,
      now: this.deps.clock.now(),
    });
    await uow.websites.save(website);
    await uow.commit();
    return toWebsiteResponse(website);
  }

  async list(): Promise<WebsiteListItemView[]> {
    return this.deps.websiteQueries.listWithStats();
  }

  async update(id: string, request: UpdateWebsiteRequest): Promise<WebsiteResponse> {
    const uow = this.deps.unitOfWork.create();
    const website = await this.getWebsite(uow.websites.findById(id), id);

    if (request.name !== undefined) {
      website.rename(request.name);
    }
    if (request.openBoxUrl !== undefined) {
      website.changeOpenBoxUrl(WebsiteUrl.parse(request.openBoxUrl));
    }
    if (request.status === 'paused') {
      website.pause();
    } else if (request.status === 'active') {
      website.activate();
    }

    await uow.websites.save(website);
    await uow.commit();
    return toWebsiteResponse(website);
  }

  async remove(id: string): Promise<void> {
    const uow = this.deps.unitOfWork.create();
    await this.getWebsite(uow.websites.findById(id), id);
    await uow.websites.remove(id);
    await uow.commit();
  }

  private async getWebsite(lookup: Promise<Website | null>, id: string): Promise<Website> {
    const website = await lookup;
    if (!website) {
      throw new NotFoundError('website', id);
    }
    return website;
  }
}
