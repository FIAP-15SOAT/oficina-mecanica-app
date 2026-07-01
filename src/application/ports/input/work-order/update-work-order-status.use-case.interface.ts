import { UpdateWorkOrderStatusDto } from './dto/update-work-order-status.dto';
import { WorkOrder } from '@domain/entities/work-order.entity';

export interface IUpdateWorkOrderStatusUseCase {
  execute(id: string, data: UpdateWorkOrderStatusDto): Promise<WorkOrder>;
}
