import type { DbTransaction } from './DbClient';

/** Escrita registrada por um repositório, executada só no commit da unidade de trabalho. */
export type PendingWrite = (tx: DbTransaction) => void;

export type EnqueueWrite = (write: PendingWrite) => void;
