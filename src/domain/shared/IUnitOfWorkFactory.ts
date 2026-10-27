import type { IUnitOfWork } from './IUnitOfWork';

/**
 * Cria uma unidade de trabalho por operação, para que as alterações pendentes de
 * operações simultâneas (duas requisições ao mesmo tempo) nunca se misturem.
 */
export interface IUnitOfWorkFactory {
  create(): IUnitOfWork;
}
