import type { PaginationAction } from '@obc/domain/extraction/PaginationAction';

export interface ReceivePageResponse {
  pagesReceived: number;
  /** Como chegar à próxima leva de produtos; `null` encerra a captura. */
  nextPage: PaginationAction | null;
}
