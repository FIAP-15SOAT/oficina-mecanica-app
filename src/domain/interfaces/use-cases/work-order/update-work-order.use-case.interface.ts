import { WorkOrder } from '@domain/entities/work-order.entity';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

export interface IUpdateWorkOrderUseCase {
  execute(id: string, data: UpdateWorkOrderDto): Promise<WorkOrder>;
}
