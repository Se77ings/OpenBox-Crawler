import { randomUUID } from 'node:crypto';
import type { IIdGenerator } from '@obc/domain/shared/IIdGenerator';

export class UuidGenerator implements IIdGenerator {
  next(): string {
    return randomUUID();
  }
}
