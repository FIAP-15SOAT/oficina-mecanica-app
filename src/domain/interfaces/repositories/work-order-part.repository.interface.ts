import { WorkOrderPartSupply } from '../../entities/work-order-part-supply.entity';

export interface IWorkOrderPartSupplyRepository {
  createMany(items: WorkOrderPartSupply[]): Promise<void>;
}
