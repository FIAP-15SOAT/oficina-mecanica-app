import { randomUUID } from 'node:crypto';
import { validate as isUuid } from 'uuid';
import { WorkOrderStatus } from '../enums/work-order-status.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { Customer } from './customer.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';
import { WorkOrderService } from './work-order-service.entity';
import { WorkOrderPartSupply } from './work-order-part-supply.entity';

const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000;
const MAX_INTERNAL_NOTES_LENGTH = 2000;

import { UserRole } from '../enums/user-role.enum';

export interface CreateWorkOrderProps {
  number: string;
  customerId: string;
  vehicleId: string;
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  assignedUser?: User | null;
}

export interface UpdateWorkOrderProps {
  problemDescription?: string | null;
  internalNotes?: string | null;
  mileageAtService?: number | null;
  assignedUser?: User | null;
}

export interface WorkOrderProps {
  id: string;
  number: string;
  customerId: string;
  vehicleId: string;
  assignedUserId: string | null;
  status: WorkOrderStatus;
  problemDescription: string | null;
  internalNotes: string | null;
  mileageAtService: number | null;
  totalAmount: number;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkOrder {
  readonly id: string;
  readonly number: string;
  readonly customerId: string;
  readonly vehicleId: string;
  assignedUserId: string | null;
  status: WorkOrderStatus;
  problemDescription: string | null;
  internalNotes: string | null;
  mileageAtService: number | null;
  totalAmount: number;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  deliveredAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  customer?: Customer;
  vehicle?: Vehicle;
  assignedUser?: User | null;
  services?: WorkOrderService[];
  partSupplies?: WorkOrderPartSupply[];

  private constructor(props: WorkOrderProps) {
    this.id = props.id;
    this.number = props.number;
    this.customerId = props.customerId;
    this.vehicleId = props.vehicleId;
    this.assignedUserId = props.assignedUserId;
    this.status = props.status;
    this.problemDescription = props.problemDescription;
    this.internalNotes = props.internalNotes;
    this.mileageAtService = props.mileageAtService;
    this.totalAmount = props.totalAmount;
    this.approvedAt = props.approvedAt;
    this.rejectedAt = props.rejectedAt;
    this.startedAt = props.startedAt;
    this.finishedAt = props.finishedAt;
    this.deliveredAt = props.deliveredAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: WorkOrderProps): WorkOrder {
    return new WorkOrder(props);
  }

  static create(props: CreateWorkOrderProps): WorkOrder {
    WorkOrder.validateCustomerId(props.customerId);
    WorkOrder.validateVehicleId(props.vehicleId);
    WorkOrder.validateMileage(props.mileageAtService ?? null);
    WorkOrder.validateProblemDescription(props.problemDescription ?? null);
    WorkOrder.validateInternalNotes(props.internalNotes ?? null);
    WorkOrder.validateAssignedUser(props.assignedUser ?? null);

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
      assignedUserId: props.assignedUser?.id ?? null,
      approvedAt: null,
      rejectedAt: null,
      startedAt: null,
      finishedAt: null,
      deliveredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    workOrder.assignedUser = props.assignedUser ?? null;

    return workOrder;
  }

  private canCreateQuote(): boolean {
    return (
      this.status === WorkOrderStatus.IN_DIAGNOSIS ||
      this.status === WorkOrderStatus.AWAITING_APPROVAL ||
      this.status === WorkOrderStatus.REJECTED
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

    const nextProblemDescription =
      props.problemDescription !== undefined
        ? (props.problemDescription?.trim() ?? null)
        : this.problemDescription;
    const nextInternalNotes =
      props.internalNotes !== undefined
        ? (props.internalNotes?.trim() ?? null)
        : this.internalNotes;
    const nextMileageAtService =
      props.mileageAtService !== undefined ? props.mileageAtService : this.mileageAtService;
    const nextAssignedUser =
      props.assignedUser !== undefined ? (props.assignedUser ?? null) : (this.assignedUser ?? null);
    const nextAssignedUserId =
      props.assignedUser !== undefined ? (props.assignedUser?.id ?? null) : this.assignedUserId;

    WorkOrder.validateMileage(nextMileageAtService);
    WorkOrder.validateProblemDescription(nextProblemDescription);
    WorkOrder.validateInternalNotes(nextInternalNotes);
    WorkOrder.validateAssignedUser(nextAssignedUser);

    this.problemDescription = nextProblemDescription;
    this.internalNotes = nextInternalNotes;
    this.mileageAtService = nextMileageAtService;
    this.assignedUser = nextAssignedUser;
    this.assignedUserId = nextAssignedUserId;

    this.updatedAt = new Date();
  }

  changeStatus(newStatus: WorkOrderStatus, notes?: string | null): void {
    this.validateStatusTransition(newStatus, notes);
    this.updateTimestampsForStatus(newStatus);
    this.status = newStatus;
    this.updatedAt = new Date();
  }

  private static readonly STATUS_TRANSITION_MAP: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    [WorkOrderStatus.RECEIVED]: [WorkOrderStatus.IN_DIAGNOSIS, WorkOrderStatus.CANCELLED],
    [WorkOrderStatus.IN_DIAGNOSIS]: [WorkOrderStatus.AWAITING_APPROVAL, WorkOrderStatus.CANCELLED],
    [WorkOrderStatus.AWAITING_APPROVAL]: [
      WorkOrderStatus.APPROVED,
      WorkOrderStatus.REJECTED,
      WorkOrderStatus.CANCELLED,
    ],
    [WorkOrderStatus.REJECTED]: [WorkOrderStatus.AWAITING_APPROVAL],
    [WorkOrderStatus.APPROVED]: [WorkOrderStatus.IN_PROGRESS],
    [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.COMPLETED],
    [WorkOrderStatus.COMPLETED]: [WorkOrderStatus.DELIVERED],
    [WorkOrderStatus.DELIVERED]: [],
    [WorkOrderStatus.CANCELLED]: [],
  };

  private validateStatusTransition(newStatus: WorkOrderStatus, notes?: string | null): void {
    if (this.status === newStatus) {
      throw new BusinessRuleViolationException(
        `A ordem de serviço já está no status ${newStatus}.`,
      );
    }

    const allowedTransitions = WorkOrder.STATUS_TRANSITION_MAP[this.status] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BusinessRuleViolationException(
        `Transição de status não permitida: de ${this.status} para ${newStatus}.`,
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
    } else if (newStatus === WorkOrderStatus.APPROVED) {
      this.approvedAt = now;
    }
  }

  private static validateCustomerId(customerId: string): void {
    if (!customerId) {
      throw new DomainValidationException('ID do cliente é obrigatório.');
    }

    if (!isUuid(customerId)) {
      throw new DomainValidationException('ID do cliente deve ser um UUID válido.');
    }
  }

  private static validateVehicleId(vehicleId: string): void {
    if (!vehicleId) {
      throw new DomainValidationException('ID do veículo é obrigatório.');
    }

    if (!isUuid(vehicleId)) {
      throw new DomainValidationException('ID do veículo deve ser um UUID válido.');
    }
  }

  private static validateMileage(mileageAtService: number | null): void {
    if (mileageAtService !== undefined && mileageAtService !== null && mileageAtService < 0) {
      throw new DomainValidationException('Quilometragem não pode ser negativa.');
    }
  }

  private static validateProblemDescription(problemDescription: string | null): void {
    if (!problemDescription) {
      return;
    }

    const trimmed = problemDescription.trim();

    if (trimmed.length > MAX_PROBLEM_DESCRIPTION_LENGTH) {
      throw new DomainValidationException(
        `Descrição do problema deve ter no máximo ${MAX_PROBLEM_DESCRIPTION_LENGTH} caracteres.`,
      );
    }
  }

  private static validateInternalNotes(internalNotes: string | null): void {
    if (!internalNotes) {
      return;
    }

    const trimmed = internalNotes.trim();

    if (trimmed.length > MAX_INTERNAL_NOTES_LENGTH) {
      throw new DomainValidationException(
        `Notas internas devem ter no máximo ${MAX_INTERNAL_NOTES_LENGTH} caracteres.`,
      );
    }
  }

  private static validateAssignedUser(assignedUser: User | null): void {
    if (assignedUser) {
      if (assignedUser.role !== UserRole.MECHANIC || !assignedUser.isActive) {
        throw new BusinessRuleViolationException(
          'Apenas mecânicos ativos podem ser atribuídos a uma ordem de serviço',
        );
      }
    }
  }
}
