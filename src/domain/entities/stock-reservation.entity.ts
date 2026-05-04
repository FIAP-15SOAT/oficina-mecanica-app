import { randomUUID } from 'node:crypto';
import { validate as isUuid } from 'uuid';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { PartSupply } from './part-supply.entity';
import { WorkOrder } from './work-order.entity';

export interface CreateStockReservationProps {
  partSupplyId: string;
  workOrderId: string;
  quantity: number;
}

export class StockReservation {
  id!: string;
  partSupplyId!: string;
  workOrderId!: string;
  quantity!: number;
  createdAt!: Date;

  partSupply?: PartSupply;
  workOrder?: WorkOrder;

  constructor(partial: Partial<StockReservation>) {
    Object.assign(this, partial);
  }

  static create(props: CreateStockReservationProps): StockReservation {
    const reservation = new StockReservation({
      id: randomUUID(),
      partSupplyId: props.partSupplyId?.trim(),
      workOrderId: props.workOrderId?.trim(),
      quantity: props.quantity,
      createdAt: new Date(),
    });

    reservation.validatePartSupplyId();
    reservation.validateWorkOrderId();
    reservation.validateQuantity();

    return reservation;
  }

  private validatePartSupplyId(): void {
    if (!this.partSupplyId) {
      throw new DomainValidationException('ID da peça/insumo é obrigatório.');
    }

    if (!isUuid(this.partSupplyId)) {
      throw new DomainValidationException(`ID da peça/insumo deve ser um UUID válido.`);
    }
  }

  private validateWorkOrderId(): void {
    if (!this.workOrderId) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório.');
    }

    if (!isUuid(this.workOrderId)) {
      throw new DomainValidationException(`ID da ordem de serviço deve ser um UUID válido.`);
    }
  }

  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser um inteiro positivo.');
    }
  }
}
