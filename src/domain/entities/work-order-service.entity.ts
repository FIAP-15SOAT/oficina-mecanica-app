import { validate as isUuid } from 'uuid';
import { randomUUID } from 'crypto';
import { WorkOrderServiceStatus } from '../enums/work-order-service-status.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';

export interface CreateWorkOrderServiceProps {
  workOrderId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

export class WorkOrderService {
  id!: string;
  workOrderId!: string;
  serviceId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  status!: WorkOrderServiceStatus;
  startedAt!: Date | null;
  finishedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<WorkOrderService>) {
    Object.assign(this, partial);
  }

  static create(props: CreateWorkOrderServiceProps): WorkOrderService {
    const now = new Date();
    const entity = new WorkOrderService({
      id: randomUUID(),
      workOrderId: props.workOrderId,
      serviceId: props.serviceId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      status: WorkOrderServiceStatus.PENDING,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    entity.validateWorkOrderId();
    entity.validateServiceId();
    entity.validateQuantity();
    entity.validateUnitPrice();

    return entity;
  }

  startService(): void {
    const now = new Date();
    this.status = WorkOrderServiceStatus.IN_PROGRESS;
    this.startedAt = now;
    this.updatedAt = now;
  }

  completeService(): void {
    const now = new Date();
    this.status = WorkOrderServiceStatus.COMPLETED;
    this.finishedAt = now;
    this.updatedAt = now;
  }

  private validateWorkOrderId(): void {
    if (!this.workOrderId) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório.');
    }

    if (!isUuid(this.workOrderId)) {
      throw new DomainValidationException('ID da ordem de serviço deve ser um UUID válido.');
    }
  }

  private validateServiceId(): void {
    if (!this.serviceId) {
      throw new DomainValidationException('ID do serviço é obrigatório.');
    }

    if (!isUuid(this.serviceId)) {
      throw new DomainValidationException('ID do serviço deve ser um UUID válido.');
    }
  }

  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity) || this.quantity < 1) {
      throw new DomainValidationException('Quantidade deve ser um inteiro positivo.');
    }
  }

  private validateUnitPrice(): void {
    if (!Number.isFinite(this.unitPrice) || this.unitPrice < 0) {
      throw new DomainValidationException('Preço unitário deve ser um número não negativo.');
    }
  }
}
