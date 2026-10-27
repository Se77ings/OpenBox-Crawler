import type { IUnitOfWork } from '@obc/domain/shared/IUnitOfWork';
import type { IUnitOfWorkFactory } from '@obc/domain/shared/IUnitOfWorkFactory';
import type { ObcDatabase } from './ObcDatabase';
import { UnitOfWork } from './UnitOfWork';

export class UnitOfWorkFactory implements IUnitOfWorkFactory {
  constructor(private readonly database: ObcDatabase) {}

  create(): IUnitOfWork {
    return new UnitOfWork(this.database.client);
  }
}
