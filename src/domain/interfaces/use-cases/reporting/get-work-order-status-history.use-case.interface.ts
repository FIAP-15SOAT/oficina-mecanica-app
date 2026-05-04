import { StatusHistory } from '@domain/entities/status-history.entity';

export interface IGetWorkOrderStatusHistoryUseCase {
  execute(workOrderId: string): Promise<StatusHistory[]>;
}
