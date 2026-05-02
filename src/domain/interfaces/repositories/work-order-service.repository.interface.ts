import { WorkOrderService } from '../../entities/work-order-service.entity';

export interface IWorkOrderServiceRepository {
  create(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  findByWorkOrderAndService(
    workOrderId: string,
    serviceId: string,
  ): Promise<WorkOrderService | null>;
  findByWorkOrderId(workOrderId: string): Promise<WorkOrderService[]>;
  update(workOrderService: WorkOrderService): Promise<WorkOrderService>;
  delete(workOrderId: string, serviceId: string): Promise<void>;
  isAllCompletedByWorkOrderId(workOrderId: string): Promise<boolean>;
}
