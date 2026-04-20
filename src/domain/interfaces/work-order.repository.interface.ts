import { WorkOrder } from '../entities/work-order.entity';
import { WorkOrderStatus } from '../enums/work-order-status.enum';

export interface IWorkOrderRepository {
  create(workOrder: WorkOrder): Promise<WorkOrder>;
  findById(id: string): Promise<WorkOrder | null>;
  findByNumber(number: string): Promise<WorkOrder | null>;
  findByCustomerId(customerId: string): Promise<WorkOrder[]>;
  findByStatus(status: WorkOrderStatus): Promise<WorkOrder[]>;
  findAll(): Promise<WorkOrder[]>;
  update(id: string, data: Partial<WorkOrder>): Promise<WorkOrder>;
  updateStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder>;
}
