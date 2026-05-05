import { randomUUID } from 'node:crypto';
import { QuoteStatus } from '../enums/quote-status.enum';
import { QuoteService } from './quote-service.entity';
import { QuotePartSupply } from './quote-part-supply.entity';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { validate as isUuid } from 'uuid';

const MAX_NOTES_LENGTH = 2000;

export interface CreateQuoteProps {
  workOrderId: string;
  notes?: string | null;
}

interface QuoteProps {
  id: string;
  workOrderId: string;
  servicesAmount: number;
  partsAmount: number;
  totalAmount: number;
  status: QuoteStatus;
  notes: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Quote {
  readonly id: string;
  readonly workOrderId: string;
  servicesAmount: number;
  partsAmount: number;
  totalAmount: number;
  status: QuoteStatus;
  notes: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  services?: QuoteService[];
  partsSupplies?: QuotePartSupply[];

  private constructor(props: QuoteProps) {
    this.id = props.id;
    this.workOrderId = props.workOrderId;
    this.servicesAmount = props.servicesAmount;
    this.partsAmount = props.partsAmount;
    this.totalAmount = props.totalAmount;
    this.status = props.status;
    this.notes = props.notes;
    this.sentAt = props.sentAt;
    this.approvedAt = props.approvedAt;
    this.rejectedAt = props.rejectedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: QuoteProps): Quote {
    return new Quote(props);
  }

  static create(props: CreateQuoteProps): Quote {
    const now = new Date();

    Quote.validateWorkOrderId(props.workOrderId);
    Quote.validateNotes(props.notes ?? null);

    return new Quote({
      id: randomUUID(),
      workOrderId: props.workOrderId,
      servicesAmount: 0,
      partsAmount: 0,
      totalAmount: 0,
      status: QuoteStatus.PENDING,
      notes: props.notes?.trim() ?? null,
      sentAt: null,
      approvedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  private static validateWorkOrderId(workOrderId: string): void {
    if (!workOrderId || !workOrderId.trim()) {
      throw new DomainValidationException('ID da ordem de serviço é obrigatório');
    }

    if (!isUuid(workOrderId.trim())) {
      throw new DomainValidationException('ID da ordem de serviço deve ser um UUID válido');
    }
  }

  private static validateNotes(notes: string | null): void {
    if (!notes) {
      return;
    }

    const trimmed = notes.trim();

    if (trimmed.length > MAX_NOTES_LENGTH) {
      throw new DomainValidationException(
        `Notas devem ter no máximo ${MAX_NOTES_LENGTH} caracteres`,
      );
    }
  }

  recalculateTotals(): void {
    const servicesAmount = (this.services ?? []).reduce((sum, s) => sum + s.totalPrice, 0);

    const partsAmount = (this.partsSupplies ?? []).reduce((sum, p) => sum + p.totalPrice, 0);

    this.servicesAmount = servicesAmount;
    this.partsAmount = partsAmount;
    this.totalAmount = servicesAmount + partsAmount;
    this.updatedAt = new Date();
  }

  canChangeItems(): boolean {
    return this.status === QuoteStatus.PENDING;
  }

  ensureCanChangeItems(): void {
    if (!this.canChangeItems()) {
      throw new BusinessRuleViolationException(
        `Não é possível alterar itens em um orçamento que não está pendente.`,
      );
    }
  }

  canSubmit(): boolean {
    return this.status === QuoteStatus.PENDING;
  }

  ensureCanSubmit(): void {
    if (!this.canSubmit()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser enviado se estiver no status PENDING. Status atual: "${this.status}".`,
      );
    }
  }

  canApprove(): boolean {
    return this.status === QuoteStatus.SENT;
  }

  ensureCanApprove(): void {
    if (!this.canApprove()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser aprovado se estiver no status SENT. Status atual: "${this.status}".`,
      );
    }
  }

  canReject(): boolean {
    return this.status === QuoteStatus.SENT;
  }

  ensureCanReject(): void {
    if (!this.canReject()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser rejeitado se estiver no status SENT. Status atual: "${this.status}".`,
      );
    }
  }

  approve(): void {
    const now = new Date();
    this.status = QuoteStatus.APPROVED;
    this.approvedAt = now;
    this.updatedAt = now;
  }

  reject(): void {
    const now = new Date();
    this.status = QuoteStatus.REJECTED;
    this.rejectedAt = now;
    this.updatedAt = now;
  }
}
