import { DomainValidationException } from '../exceptions/domain-validation.exception';

export interface CreateWorkOrderPartSupplyProps {
  workOrderId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
}

export class WorkOrderPartSupply {
  workOrderId!: string;
  partSupplyId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrderPartSupply>) {
    Object.assign(this, partial);
  }

  static create(props: CreateWorkOrderPartSupplyProps): WorkOrderPartSupply {
    const entity = new WorkOrderPartSupply({
      workOrderId: props.workOrderId,
      partSupplyId: props.partSupplyId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    entity.validateQuantity();
    entity.validateUnitPrice();

    return entity;
  }

  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity)) {
      throw new DomainValidationException('Quantidade deve ser um nÃºmero inteiro');
    }
    if (this.quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser maior que zero');
    }
  }

  private validateUnitPrice(): void {
    if (!Number.isFinite(this.unitPrice)) {
      throw new DomainValidationException('Preço unitário inválido');
    }
    if (this.unitPrice <= 0) {
      throw new DomainValidationException('Preço unitário deve ser maior que zero');
    }
  }
}
