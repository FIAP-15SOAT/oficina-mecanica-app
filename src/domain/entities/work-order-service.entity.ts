import { validate as isUuid } from 'uuid';
import { randomUUID } from 'node:crypto';
import { WorkOrderServiceStatus } from '../enums/work-order-service-status.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { LineItemPrice } from '../value-objects/line-item-price.vo';
import { Service } from './service.entity';

export interface CreateWorkOrderServiceProps {
  workOrderId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

interface WorkOrderServiceProps {
  id?: string;
  workOrderId: string;
  serviceId: string;
  lineItem: LineItemPrice;
  status: WorkOrderServiceStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReconstitueWorkOrderServiceProps {
  id?: string;
  workOrderId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: WorkOrderServiceStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkOrderService {
  readonly id: string;
  readonly workOrderId: string;
  readonly serviceId: string;
  private readonly _lineItem: LineItemPrice;
  status: WorkOrderServiceStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  service?: Service;

  private constructor(props: WorkOrderServiceProps) {
    this.id = props.id ?? randomUUID();
    this.workOrderId = props.workOrderId;
    this.serviceId = props.serviceId;
    this._lineItem = props.lineItem;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.finishedAt = props.finishedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: ReconstitueWorkOrderServiceProps): WorkOrderService {
    return new WorkOrderService({
      id: props.id,
      workOrderId: props.workOrderId,
      serviceId: props.serviceId,
      lineItem: LineItemPrice.reconstitute(props.quantity, props.unitPrice, props.totalPrice),
      status: props.status,
      startedAt: props.startedAt,
      finishedAt: props.finishedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  static create(props: CreateWorkOrderServiceProps): WorkOrderService {
    const now = new Date();

    WorkOrderService.validateWorkOrderId(props.workOrderId);
    WorkOrderService.validateServiceId(props.serviceId);

    const lineItem = LineItemPrice.create(props.quantity, props.unitPrice);

    return new WorkOrderService({
      id: randomUUID(),
      workOrderId: props.workOrderId,
      serviceId: props.serviceId,
      lineItem,
      status: WorkOrderServiceStatus.PENDING,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  startService(): void {
    if (this.status === WorkOrderServiceStatus.IN_PROGRESS) {
      throw new BusinessRuleViolationException('O serviço já está em andamento.');
    }

    const now = new Date();
    this.status = WorkOrderServiceStatus.IN_PROGRESS;
    this.startedAt = now;
    this.updatedAt = now;
  }

  completeService(): void {
    if (this.status === WorkOrderServiceStatus.COMPLETED) {
      throw new BusinessRuleViolationException('O serviço já está concluído.');
    }

    const now = new Date();
    this.status = WorkOrderServiceStatus.COMPLETED;
    this.finishedAt = now;
    this.updatedAt = now;
  }

  get lineItem(): LineItemPrice {
    return this._lineItem;
  }

  get quantity(): number {
    return this._lineItem.quantity;
  }

  get unitPrice(): number {
    return this._lineItem.unitPrice;
  }

  get totalPrice(): number {
    return this._lineItem.totalPrice;
  }

  private static validateWorkOrderId(workOrderId: string): void {
    if (!workOrderId) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório.');
    }

    if (!isUuid(workOrderId)) {
      throw new DomainValidationException('ID da ordem de serviço deve ser um UUID válido.');
    }
  }

  private static validateServiceId(serviceId: string): void {
    if (!serviceId) {
      throw new DomainValidationException('ID do serviço é obrigatório.');
    }

    if (!isUuid(serviceId)) {
      throw new DomainValidationException('ID do serviço deve ser um UUID válido.');
    }
  }
}
