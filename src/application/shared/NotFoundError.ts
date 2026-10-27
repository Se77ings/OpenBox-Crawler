import { DomainError } from '@obc/domain/shared/DomainError';

/** Recurso inexistente. O código termina em `.not-found`, o que a API traduz em 404. */
export class NotFoundError extends DomainError {
  constructor(resource: 'website' | 'crawl-run', id: string) {
    const label = resource === 'website' ? 'Site' : 'Busca';
    super(`${resource}.not-found`, `${label} não encontrado: ${id}`);
    this.name = 'NotFoundError';
  }
}
