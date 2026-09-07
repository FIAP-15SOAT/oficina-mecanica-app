import { WorkOrder } from '@domain/entities/work-order.entity';

export interface IFindMyWorkOrderByIdUseCase {
  execute(userId: string, workOrderId: string): Promise<WorkOrder>;
}
