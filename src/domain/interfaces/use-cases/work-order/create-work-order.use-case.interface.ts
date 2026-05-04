import { WorkOrder } from '@domain/entities/work-order.entity';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';

export interface ICreateWorkOrderUseCase {
  execute(input: CreateWorkOrderDto): Promise<WorkOrder>;
}
