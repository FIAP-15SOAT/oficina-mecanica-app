import { randomUUID } from 'node:crypto';
import { QuoteStatus } from '../enums/quote-status.enum';
import { QuoteService } from './quote-service.entity';
import { QuotePartSupply } from './quote-part-supply.entity';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';

export interface CreateQuoteProps {
  workOrderId: string;
  notes?: string | null;
}

export class Quote {
  id!: string;
  workOrderId!: string;
  servicesAmount!: number;
  partsAmount!: number;
  totalAmount!: number;
  status!: QuoteStatus;
  notes!: string | null;
  sentAt!: Date | null;
  approvedAt!: Date | null;
  rejectedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  services?: QuoteService[];
  partsSupplies?: QuotePartSupply[];

  constructor(partial: Partial<Quote>) {
    Object.assign(this, partial);
  }

  static create(props: CreateQuoteProps): Quote {
    const now = new Date();

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
