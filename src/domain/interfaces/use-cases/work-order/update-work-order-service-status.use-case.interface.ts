import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { UpdateWorkOrderServiceStatusDto } from './dto/update-work-order-service-status.dto';

export interface IUpdateWorkOrderServiceStatusUseCase {
  execute(input: UpdateWorkOrderServiceStatusDto): Promise<WorkOrderService>;
}
