import type { IClock } from '@obc/domain/shared/IClock';

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
