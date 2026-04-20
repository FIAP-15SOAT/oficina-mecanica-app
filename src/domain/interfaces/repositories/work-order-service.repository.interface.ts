import { WorkOrderService } from '../../entities/work-order-service.entity';

export interface IWorkOrderServiceRepository {
  create(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  findById(id: string): Promise<WorkOrderService | null>;
  findByWorkOrderId(workOrderId: string): Promise<WorkOrderService[]>;
  update(id: string, data: Partial<WorkOrderService>): Promise<WorkOrderService>;
  delete(id: string): Promise<void>;
}
