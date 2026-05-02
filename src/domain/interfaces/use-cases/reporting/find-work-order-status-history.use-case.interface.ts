import { StatusHistory } from '@domain/entities/status-history.entity';

export interface IFindWorkOrderStatusHistoryUseCase {
  execute(workOrderId: string): Promise<StatusHistory[]>;
}
