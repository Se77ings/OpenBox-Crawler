/**
 * Erro de regra de negócio. O `code` é estável e permite que as camadas externas
 * traduzam o erro (ex.: a API converte em 400/409) sem depender da mensagem.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
