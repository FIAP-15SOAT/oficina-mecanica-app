import { WorkOrderService } from '../../entities/work-order-service.entity';

export interface IWorkOrderServiceRepository {
  create(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  findByWorkOrderAndService(
    workOrderId: string,
    serviceId: string,
  ): Promise<WorkOrderService | null>;
  update(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  isAllCompletedByWorkOrderId(workOrderId: string): Promise<boolean>;
}
