import { WorkOrder } from '@domain/entities/work-order.entity';

export interface IFindWorkOrderByIdUseCase {
  execute(id: string): Promise<WorkOrder>;
}
