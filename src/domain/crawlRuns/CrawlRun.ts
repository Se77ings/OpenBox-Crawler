import { DomainError } from '../shared/DomainError';
import type { CrawlRunStatus } from './CrawlRunStatus';

const FINISHED_STATUSES: readonly CrawlRunStatus[] = ['completed', 'failed', 'cancelled'];

export interface CrawlRunResult {
  productsFound: number;
  newProducts: number;
  priceDrops: number;
}

export interface CrawlRunProps extends CrawlRunResult {
  id: string;
  websiteId: string;
  status: CrawlRunStatus;
  pagesReceived: number;
  error: string | null;
  startedAt: Date;
  lastActivityAt: Date;
  finishedAt: Date | null;
}

/** Uma busca de produtos em um site, disparada manualmente pelo usuário. */
export class CrawlRun {
  private constructor(private props: CrawlRunProps) {}

  static start(input: { id: string; websiteId: string; now: Date }): CrawlRun {
    return new CrawlRun({
      id: input.id,
      websiteId: input.websiteId,
      status: 'pending',
      pagesReceived: 0,
      productsFound: 0,
      newProducts: 0,
      priceDrops: 0,
      error: null,
      startedAt: input.now,
      lastActivityAt: input.now,
      finishedAt: null,
    });
  }

  static restore(props: CrawlRunProps): CrawlRun {
    return new CrawlRun({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get websiteId(): string {
    return this.props.websiteId;
  }
  get status(): CrawlRunStatus {
    return this.props.status;
  }
  get pagesReceived(): number {
    return this.props.pagesReceived;
  }
  get productsFound(): number {
    return this.props.productsFound;
  }
  get newProducts(): number {
    return this.props.newProducts;
  }
  get priceDrops(): number {
    return this.props.priceDrops;
  }
  get error(): string | null {
    return this.props.error;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get lastActivityAt(): Date {
    return this.props.lastActivityAt;
  }
  get finishedAt(): Date | null {
    return this.props.finishedAt;
  }

  get isFinished(): boolean {
    return FINISHED_STATUSES.includes(this.props.status);
  }

  /**
   * Registra uma página capturada pela extensão. A primeira página tira a rodada de
   * `pending` e a coloca em `capturing`.
   */
  registerPage(input: { maxPages: number; now: Date }): void {
    this.ensureStatus(['pending', 'capturing'], 'receber páginas');
    if (this.props.pagesReceived >= input.maxPages) {
      throw new DomainError(
        'crawl-run.page-limit',
        `A busca atingiu o limite de ${String(input.maxPages)} páginas.`,
      );
    }
    this.props.status = 'capturing';
    this.props.pagesReceived += 1;
    this.props.lastActivityAt = input.now;
  }

  /** Fim da captura: as páginas recebidas passam a ser processadas. */
  beginProcessing(now: Date): void {
    this.ensureStatus(['capturing'], 'iniciar o processamento');
    this.props.status = 'processing';
    this.props.lastActivityAt = now;
  }

  complete(result: CrawlRunResult, now: Date): void {
    this.ensureStatus(['processing'], 'concluir');
    this.props.status = 'completed';
    this.props.productsFound = result.productsFound;
    this.props.newProducts = result.newProducts;
    this.props.priceDrops = result.priceDrops;
    this.finish(now);
  }

  fail(reason: string, now: Date): void {
    this.ensureNotFinished('registrar falha');
    this.props.status = 'failed';
    this.props.error = reason;
    this.finish(now);
  }

  /** O processamento não é interrompido: cancelar só vale durante a captura. */
  cancel(now: Date): void {
    this.ensureStatus(['pending', 'capturing'], 'cancelar');
    this.props.status = 'cancelled';
    this.finish(now);
  }

  /**
   * Indica uma rodada abandonada (ex.: o navegador foi fechado no meio da captura),
   * que deve ser marcada como falha para liberar o site para uma nova busca.
   */
  isStale(now: Date, maxIdleMs: number): boolean {
    return !this.isFinished && now.getTime() - this.props.lastActivityAt.getTime() > maxIdleMs;
  }

  private finish(now: Date): void {
    this.props.finishedAt = now;
    this.props.lastActivityAt = now;
  }

  private ensureNotFinished(action: string): void {
    if (this.isFinished) {
      throw this.invalidTransition(action);
    }
  }

  private ensureStatus(allowed: readonly CrawlRunStatus[], action: string): void {
    if (!allowed.includes(this.props.status)) {
      throw this.invalidTransition(action);
    }
  }

  private invalidTransition(action: string): DomainError {
    return new DomainError(
      'crawl-run.invalid-transition',
      `Não é possível ${action} uma busca com status "${this.props.status}".`,
    );
  }
}
