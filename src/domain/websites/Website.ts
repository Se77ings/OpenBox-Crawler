import { DomainError } from '../shared/DomainError';
import type { WebsiteStatus } from './WebsiteStatus';
import type { WebsiteUrl } from './WebsiteUrl';

const NAME_MAX_LENGTH = 100;

export interface WebsiteProps {
  id: string;
  name: string;
  openBoxUrl: WebsiteUrl;
  logoUrl: string | null;
  /** Extrator escolhido no cadastro. `null` quando nenhum extrator reconhece o site. */
  extractorKey: string | null;
  status: WebsiteStatus;
  lastCrawlAt: Date | null;
  createdAt: Date;
}

export interface RegisterWebsiteInput {
  id: string;
  name: string;
  openBoxUrl: WebsiteUrl;
  logoUrl: string | null;
  extractorKey: string | null;
  now: Date;
}

/** Site cadastrado, cuja página de open box pode ser buscada pela extensão. */
export class Website {
  private constructor(private props: WebsiteProps) {}

  static register(input: RegisterWebsiteInput): Website {
    return new Website({
      id: input.id,
      name: Website.validateName(input.name),
      openBoxUrl: input.openBoxUrl,
      logoUrl: input.logoUrl,
      extractorKey: input.extractorKey,
      status: 'active',
      lastCrawlAt: null,
      createdAt: input.now,
    });
  }

  /** Reconstrói a entidade a partir da persistência, sem regras de criação. */
  static restore(props: WebsiteProps): Website {
    return new Website({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get openBoxUrl(): WebsiteUrl {
    return this.props.openBoxUrl;
  }
  get baseUrl(): string {
    return this.props.openBoxUrl.baseUrl;
  }
  get logoUrl(): string | null {
    return this.props.logoUrl;
  }
  get extractorKey(): string | null {
    return this.props.extractorKey;
  }
  get status(): WebsiteStatus {
    return this.props.status;
  }
  get lastCrawlAt(): Date | null {
    return this.props.lastCrawlAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  rename(name: string): void {
    this.props.name = Website.validateName(name);
  }

  /**
   * Troca a URL de open box. O host precisa continuar o mesmo, porque o extrator
   * escolhido no cadastro depende do site.
   */
  changeOpenBoxUrl(url: WebsiteUrl): void {
    if (url.hostname !== this.props.openBoxUrl.hostname) {
      throw new DomainError(
        'website.host-changed',
        'A nova URL precisa ser do mesmo site. Para outro site, faça um novo cadastro.',
      );
    }
    this.props.openBoxUrl = url;
  }

  pause(): void {
    this.props.status = 'paused';
  }

  activate(): void {
    this.props.status = 'active';
  }

  /** Lança erro se o site não puder ser buscado agora. */
  ensureCanCrawl(): void {
    if (this.props.status === 'paused') {
      throw new DomainError('website.paused', `O site "${this.name}" está pausado.`);
    }
    if (this.props.extractorKey === null) {
      throw new DomainError(
        'website.without-extractor',
        `Ainda não há como ler os produtos de "${this.name}".`,
      );
    }
  }

  recordCrawl(at: Date): void {
    this.props.lastCrawlAt = at;
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new DomainError('website.name-required', 'O nome do site é obrigatório.');
    }
    if (trimmed.length > NAME_MAX_LENGTH) {
      throw new DomainError(
        'website.name-too-long',
        `O nome do site deve ter no máximo ${String(NAME_MAX_LENGTH)} caracteres.`,
      );
    }
    return trimmed;
  }
}
