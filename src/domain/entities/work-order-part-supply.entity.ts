import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PartSupply } from './part-supply.entity';

export interface CreateWorkOrderPartSupplyProps {
  workOrderId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
}

interface WorkOrderPartSupplyProps {
  workOrderId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkOrderPartSupply {
  readonly workOrderId: string;
  readonly partSupplyId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  readonly createdAt: Date;
  updatedAt: Date;

  partSupply?: PartSupply;

  private constructor(props: WorkOrderPartSupplyProps) {
    this.workOrderId = props.workOrderId;
    this.partSupplyId = props.partSupplyId;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.totalPrice = props.totalPrice;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: WorkOrderPartSupplyProps): WorkOrderPartSupply {
    return new WorkOrderPartSupply(props);
  }

  static create(props: CreateWorkOrderPartSupplyProps): WorkOrderPartSupply {
    WorkOrderPartSupply.validateQuantity(props.quantity);
    WorkOrderPartSupply.validateUnitPrice(props.unitPrice);

    const now = new Date();

    return new WorkOrderPartSupply({
      workOrderId: props.workOrderId,
      partSupplyId: props.partSupplyId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: now,
      updatedAt: now,
    });
  }

  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity)) {
      throw new DomainValidationException('Quantidade deve ser um número inteiro');
    }
    if (quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser maior que zero');
    }
  }

  private static validateUnitPrice(unitPrice: number): void {
    if (!Number.isFinite(unitPrice)) {
      throw new DomainValidationException('Preço unitário inválido');
    }
    if (unitPrice <= 0) {
      throw new DomainValidationException('Preço unitário deve ser maior que zero');
    }
  }
}
