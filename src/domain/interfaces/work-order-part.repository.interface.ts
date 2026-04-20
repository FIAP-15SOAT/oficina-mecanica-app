import { WorkOrderPart } from '../entities/work-order-part.entity';

export interface IWorkOrderPartRepository {
  create(workOrderPart: WorkOrderPart): Promise<WorkOrderPart>;
  findById(id: string): Promise<WorkOrderPart | null>;
  findByWorkOrderId(workOrderId: string): Promise<WorkOrderPart[]>;
  update(id: string, data: Partial<WorkOrderPart>): Promise<WorkOrderPart>;
  delete(id: string): Promise<void>;
}
