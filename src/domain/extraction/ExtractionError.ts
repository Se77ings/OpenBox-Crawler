import { DomainError } from '../shared/DomainError';

/**
 * A página não pôde ser lida pelo extrator, normalmente porque o site mudou o layout.
 * A mensagem vira o motivo da falha da rodada e deve dizer ao usuário o que aconteceu.
 */
export class ExtractionError extends DomainError {
  constructor(message: string) {
    super('extraction.failed', message);
    this.name = 'ExtractionError';
  }
}
