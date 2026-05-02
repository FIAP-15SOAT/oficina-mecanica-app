import { WorkOrderPartSupply } from '../../entities/work-order-part-supply.entity';

export interface IWorkOrderPartSupplyRepository {
  create(workOrderPartSupply: WorkOrderPartSupply): Promise<WorkOrderPartSupply>;
  createMany(items: WorkOrderPartSupply[]): Promise<void>;
}
