import { StatusHistory } from '../entities';

export interface IStatusHistoryRepository {
  create(entry: StatusHistory): Promise<StatusHistory>;
  findByWorkOrderId(workOrderId: string): Promise<StatusHistory[]>;
}
