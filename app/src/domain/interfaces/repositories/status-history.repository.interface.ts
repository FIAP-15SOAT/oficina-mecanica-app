import { StatusHistory } from '../../entities/status-history.entity';

export interface IStatusHistoryRepository {
  create(entry: StatusHistory): Promise<StatusHistory>;
  findByWorkOrderId(workOrderId: string): Promise<StatusHistory[]>;
}
