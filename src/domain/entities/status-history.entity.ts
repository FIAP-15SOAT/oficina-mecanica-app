import { validate as isUuid } from 'uuid';
import { randomUUID } from 'crypto';
import { WorkOrderStatus } from '../enums/work-order-status.enum';
import { DomainValidationException } from '../exceptions/domain-validation.exception';

const MAX_NOTES_LENGTH = 2000;

export interface CreateStatusHistoryProps {
  workOrderId: string;
  changedById?: string | null;
  previousStatus?: WorkOrderStatus | null;
  newStatus: WorkOrderStatus;
  notes?: string | null;
}

export class StatusHistory {
  id!: string;
  workOrderId!: string;
  changedById!: string | null;
  previousStatus!: WorkOrderStatus | null;
  newStatus!: WorkOrderStatus;
  notes!: string | null;
  createdAt!: Date;

  constructor(partial: Partial<StatusHistory>) {
    Object.assign(this, partial);
  }

  static create(props: CreateStatusHistoryProps): StatusHistory {
    const entity = new StatusHistory({
      id: randomUUID(),
      workOrderId: props.workOrderId,
      changedById: props.changedById ?? null,
      previousStatus: props.previousStatus ?? null,
      newStatus: props.newStatus,
      notes: props.notes ?? null,
      createdAt: new Date(),
    });

    entity.validateWorkOrderId();
    entity.validateChangedById();
    entity.validateNewStatus();
    entity.validateNotes();

    return entity;
  }

  private validateWorkOrderId(): void {
    if (!this.workOrderId) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório.');
    }

    if (!isUuid(this.workOrderId)) {
      throw new DomainValidationException('ID da ordem de serviço deve ser um UUID válido.');
    }
  }

  private validateChangedById(): void {
    if (this.changedById !== null && this.changedById !== undefined && !isUuid(this.changedById)) {
      throw new DomainValidationException('ID do usuário deve ser um UUID válido.');
    }
  }

  private validateNewStatus(): void {
    if (!this.newStatus) {
      throw new DomainValidationException('Novo status é obrigatório.');
    }
  }

  private validateNotes(): void {
    if (this.notes !== null && this.notes !== undefined && this.notes.length > MAX_NOTES_LENGTH) {
      throw new DomainValidationException(
        `Notas devem ter no máximo ${MAX_NOTES_LENGTH} caracteres.`,
      );
    }
  }
}
