import { WorkOrderService } from '../../entities/work-order-service.entity';

export interface IWorkOrderServiceRepository {
  createMany(items: WorkOrderService[]): Promise<void>;
  findByWorkOrderAndService(
    workOrderId: string,
    serviceId: string,
  ): Promise<WorkOrderService | null>;
  update(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  isAllCompletedByWorkOrderId(workOrderId: string): Promise<boolean>;
}
