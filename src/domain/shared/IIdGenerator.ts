/** Gera identificadores únicos para novas entidades. Implementado na infra (UUID). */
export interface IIdGenerator {
  next(): string;
}
