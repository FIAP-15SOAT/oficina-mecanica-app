import { randomUUID } from 'crypto';
import { validate as isUuid } from 'uuid';
import { WorkOrderStatus } from '../enums/work-order-status.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { Customer } from './customer.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';

const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000;
const MAX_INTERNAL_NOTES_LENGTH = 2000;

export interface CreateWorkOrderProps {
  number: string;
  customerId: string;
  vehicleId: string;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  assignedUserId?: string | null;
}

export interface UpdateWorkOrderProps {
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  assignedUserId?: string | null;
}

export const PATCH_STATUS_ALLOWED = [
  WorkOrderStatus.IN_DIAGNOSIS,
  WorkOrderStatus.CANCELLED,
  WorkOrderStatus.DELIVERED,
];

export class WorkOrder {
  id!: string;
  number!: string;
  customerId!: string;
  vehicleId!: string;
  assignedUserId!: string | null;
  status!: WorkOrderStatus;
  problemDescription!: string | null;
  internalNotes!: string | null;
  mileageAtService!: number | null;
  totalAmount!: number;
  approvedAt!: Date | null;
  rejectedAt!: Date | null;
  startedAt!: Date | null;
  finishedAt!: Date | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  customer?: Customer;
  vehicle?: Vehicle;
  assignedUser?: User | null;

  constructor(partial: Partial<WorkOrder>) {
    Object.assign(this, partial);
  }

  static create(props: CreateWorkOrderProps): WorkOrder {
    const workOrder = new WorkOrder({
      id: randomUUID(),
      number: props.number,
      customerId: props.customerId,
      vehicleId: props.vehicleId,
      status: WorkOrderStatus.RECEIVED,
      problemDescription: props.problemDescription?.trim() ?? null,
      internalNotes: props.internalNotes?.trim() ?? null,
      mileageAtService: props.mileageAtService ?? null,
      totalAmount: 0,
      assignedUserId: props.assignedUserId ?? null,
      approvedAt: null,
      rejectedAt: null,
      startedAt: null,
      finishedAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    workOrder.validateCustomerId();
    workOrder.validateVehicleId();
    workOrder.validateMileage();
    workOrder.validateProblemDescription();
    workOrder.validateInternalNotes();

    return workOrder;
  }

  canCreateQuote(): boolean {
    return (
      this.status === WorkOrderStatus.IN_DIAGNOSIS ||
      this.status === WorkOrderStatus.AWAITING_APPROVAL
    );
  }

  ensureCanCreateQuote(): void {
    if (!this.canCreateQuote()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser criado quando a Ordem de Serviço está nos status permitidos. Status atual: "${this.status}".`,
      );
    }
  }

  update(props: UpdateWorkOrderProps): void {
    if (this.status !== WorkOrderStatus.RECEIVED && this.status !== WorkOrderStatus.IN_DIAGNOSIS) {
      throw new BusinessRuleViolationException(
        'Apenas ordens de serviço nos status RECEIVED ou IN_DIAGNOSIS podem ser atualizadas.',
      );
    }

    if (props.problemDescription !== undefined) this.problemDescription = props.problemDescription;
    if (props.internalNotes !== undefined) this.internalNotes = props.internalNotes;
    if (props.mileageAtService !== undefined) this.mileageAtService = props.mileageAtService;
    if (props.assignedUserId !== undefined) this.assignedUserId = props.assignedUserId;

    this.updatedAt = new Date();
  }

  changeStatus(newStatus: WorkOrderStatus, notes?: string | null): void {
    this.validateStatusTransition(newStatus, notes);
    this.updateTimestampsForStatus(newStatus);
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  private validateStatusTransition(newStatus: WorkOrderStatus, notes?: string | null): void {
    if (this.status === newStatus) {
      throw new BusinessRuleViolationException(
        `A ordem de serviço já está no status ${newStatus}.`,
      );
    }

    if (this.isTerminalStatus(this.status)) {
      throw new BusinessRuleViolationException(
        'Não é possível alterar o status de uma ordem de serviço em status terminal.',
      );
    }

    if (
      this.status === WorkOrderStatus.REJECTED &&
      newStatus !== WorkOrderStatus.AWAITING_APPROVAL
    ) {
      throw new BusinessRuleViolationException(
        'Uma ordem de serviço rejeitada só pode voltar ao status AWAITING_APPROVAL.',
      );
    }

    if (
      this.status === WorkOrderStatus.RECEIVED &&
      newStatus !== WorkOrderStatus.IN_DIAGNOSIS &&
      newStatus !== WorkOrderStatus.CANCELLED
    ) {
      throw new BusinessRuleViolationException(
        'Transição não permitida a partir do status RECEIVED.',
      );
    }

    if (newStatus === WorkOrderStatus.CANCELLED && !notes) {
      throw new BusinessRuleViolationException(
        'Notas são obrigatórias para cancelar uma ordem de serviço.',
      );
    }
  }

  private updateTimestampsForStatus(newStatus: WorkOrderStatus): void {
    const now = new Date();

    if (newStatus === WorkOrderStatus.IN_PROGRESS) {
      this.startedAt = now;
    } else if (newStatus === WorkOrderStatus.COMPLETED) {
      this.finishedAt = now;
    } else if (newStatus === WorkOrderStatus.DELIVERED) {
      this.deliveredAt = now;
    } else if (newStatus === WorkOrderStatus.REJECTED) {
      this.rejectedAt = now;
    }
  }

  private isTerminalStatus(status: WorkOrderStatus): boolean {
    return status === WorkOrderStatus.CANCELLED || status === WorkOrderStatus.DELIVERED;
  }

  private validateCustomerId(): void {
    if (!this.customerId) {
      throw new DomainValidationException('ID do cliente é obrigatório.');
    }

    if (!isUuid(this.customerId)) {
      throw new DomainValidationException('ID do cliente deve ser um UUID válido.');
    }
  }

  private validateVehicleId(): void {
    if (!this.vehicleId) {
      throw new DomainValidationException('ID do veículo é obrigatório.');
    }

    if (!isUuid(this.vehicleId)) {
      throw new DomainValidationException('ID do veículo deve ser um UUID válido.');
    }
  }

  private validateMileage(): void {
    if (
      this.mileageAtService !== undefined &&
      this.mileageAtService !== null &&
      this.mileageAtService < 0
    ) {
      throw new DomainValidationException('Quilometragem não pode ser negativa.');
    }
  }

  private validateProblemDescription(): void {
    if (
      this.problemDescription &&
      this.problemDescription.length > MAX_PROBLEM_DESCRIPTION_LENGTH
    ) {
      throw new DomainValidationException(
        `Descrição do problema deve ter no máximo ${MAX_PROBLEM_DESCRIPTION_LENGTH} caracteres.`,
      );
    }
  }

  private validateInternalNotes(): void {
    if (
      this.internalNotes &&
      this.internalNotes.length > MAX_INTERNAL_NOTES_LENGTH
    ) {
      throw new DomainValidationException(
        `Notas internas devem ter no máximo ${MAX_INTERNAL_NOTES_LENGTH} caracteres.`,
      );
    }
  }
}
