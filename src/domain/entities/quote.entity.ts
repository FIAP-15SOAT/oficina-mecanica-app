import { randomUUID } from 'node:crypto';
import { QuoteStatus } from '../enums/quote-status.enum';
import { QuoteService } from './quote-service.entity';
import { QuotePartSupply } from './quote-part-supply.entity';
import { Service } from './service.entity';
import { PartSupply } from './part-supply.entity';
import { WorkOrder } from './work-order.entity';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { EntityNotFoundException } from '../exceptions/entity-not-found.exception';
import { validate as isUuid } from 'uuid';

import { MAX_NOTES_LENGTH } from '../constants/validation/quote.constants';

export interface CreateQuoteItemServiceProps {
  service: Service;
  quantity: number;
}

export interface CreateQuoteItemPartSupplyProps {
  partSupply: PartSupply;
  quantity: number;
}

export interface CreateQuoteProps {
  workOrderId: string;
  notes?: string | null;
  services?: CreateQuoteItemServiceProps[];
  partsSupplies?: CreateQuoteItemPartSupplyProps[];
}

interface QuoteProps {
  id: string;
  workOrderId: string;
  servicesAmount: number;
  partsAmount: number;
  totalAmount: number;
  version: number;
  status: QuoteStatus;
  notes: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  services?: QuoteService[];
  partsSupplies?: QuotePartSupply[];
}

export class Quote {
  readonly id: string;
  readonly workOrderId: string;
  private _servicesAmount: number;
  private _partsAmount: number;
  private _totalAmount: number;
  version: number;
  private _status: QuoteStatus;
  notes: string | null;
  sentAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;

  workOrder?: WorkOrder;
  private _services: QuoteService[];
  private _partsSupplies: QuotePartSupply[];

  private constructor(props: QuoteProps) {
    this.id = props.id;
    this.workOrderId = props.workOrderId;
    this._servicesAmount = props.servicesAmount;
    this._partsAmount = props.partsAmount;
    this._totalAmount = props.totalAmount;
    this.version = props.version;
    this._status = props.status;
    this.notes = props.notes;
    this.sentAt = props.sentAt;
    this.approvedAt = props.approvedAt;
    this.rejectedAt = props.rejectedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this._services = props.services ?? [];
    this._partsSupplies = props.partsSupplies ?? [];
  }

  static reconstitute(props: QuoteProps): Quote {
    return new Quote(props);
  }

  static create(props: CreateQuoteProps): Quote {
    const now = new Date();

    Quote.validateWorkOrderId(props.workOrderId);
    Quote.validateNotes(props.notes ?? null);
    Quote.validateItems(props);

    const quote = new Quote({
      id: randomUUID(),
      workOrderId: props.workOrderId,
      servicesAmount: 0,
      partsAmount: 0,
      totalAmount: 0,
      version: 1,
      status: QuoteStatus.PENDING,
      notes: props.notes?.trim() ?? null,
      sentAt: null,
      approvedAt: null,
      rejectedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const hasServices = (props.services?.length ?? 0) > 0;
    const hasParts = (props.partsSupplies?.length ?? 0) > 0;

    if (hasServices || hasParts) {
      quote.addItems({
        services: props.services ?? [],
        partsSupplies: props.partsSupplies ?? [],
      });
    }

    return quote;
  }

  addService(service: Service, quantity: number): QuoteService {
    this.ensureCanChangeItems();

    const alreadyAdded = this._services.some((s) => s.serviceId === service.id);

    if (alreadyAdded) {
      throw new BusinessRuleViolationException('Serviço já adicionado ao orçamento.');
    }

    const item = QuoteService.create({
      quoteId: this.id,
      serviceId: service.id,
      quantity,
      unitPrice: service.basePrice,
    });

    this._services = [...this._services, item];
    this.recalculateTotals();

    return item;
  }

  removeService(serviceId: string): void {
    this.ensureCanChangeItems();

    const existingService = this._services.some((s) => s.serviceId === serviceId);

    if (!existingService) {
      throw new EntityNotFoundException('Serviço do Orçamento', serviceId);
    }

    this._services = this._services.filter((s) => s.serviceId !== serviceId);
    this.recalculateTotals();
  }

  updateServiceQuantity(serviceId: string, quantity: number): QuoteService {
    this.ensureCanChangeItems();

    const item = this._services.find((s) => s.serviceId === serviceId);

    if (!item) {
      throw new EntityNotFoundException('Serviço do Orçamento', serviceId);
    }

    item.updateQuantity(quantity);
    this.recalculateTotals();

    return item;
  }

  addPartSupply(partSupply: PartSupply, quantity: number): QuotePartSupply {
    this.ensureCanChangeItems();

    const alreadyAdded = this._partsSupplies.some((p) => p.partSupplyId === partSupply.id);

    if (alreadyAdded) {
      throw new BusinessRuleViolationException('Peça/Insumo já adicionado ao orçamento.');
    }

    const item = QuotePartSupply.create({
      quoteId: this.id,
      partSupplyId: partSupply.id,
      quantity,
      unitPrice: partSupply.salePrice,
    });

    this._partsSupplies = [...this._partsSupplies, item];
    this.recalculateTotals();

    return item;
  }

  removePartSupply(partSupplyId: string): void {
    this.ensureCanChangeItems();

    const existingPart = this._partsSupplies.some((p) => p.partSupplyId === partSupplyId);

    if (!existingPart) {
      throw new EntityNotFoundException('Peça/Insumo do Orçamento', partSupplyId);
    }

    this._partsSupplies = this._partsSupplies.filter((p) => p.partSupplyId !== partSupplyId);

    this.recalculateTotals();
  }

  updatePartSupplyQuantity(partSupplyId: string, quantity: number): QuotePartSupply {
    this.ensureCanChangeItems();

    const item = this._partsSupplies.find((p) => p.partSupplyId === partSupplyId);

    if (!item) {
      throw new EntityNotFoundException('Peça/Insumo do Orçamento', partSupplyId);
    }

    item.updateQuantity(quantity);
    this.recalculateTotals();
    return item;
  }

  submit(): void {
    this.ensureCanSubmit();
    this.ensureHasService();

    const now = new Date();

    this._status = QuoteStatus.SENT;
    this.sentAt = now;
    this.updatedAt = now;
  }

  private addItems(items: {
    services: CreateQuoteItemServiceProps[];
    partsSupplies: CreateQuoteItemPartSupplyProps[];
  }): void {
    this.ensureNoDuplicateServiceIds(items.services);
    this.ensureNoDuplicatePartIds(items.partsSupplies);

    const serviceItems = items.services.map((input) =>
      QuoteService.create({
        quoteId: this.id,
        serviceId: input.service.id,
        quantity: input.quantity,
        unitPrice: input.service.basePrice,
      }),
    );

    const partItems = items.partsSupplies.map((input) =>
      QuotePartSupply.create({
        quoteId: this.id,
        partSupplyId: input.partSupply.id,
        quantity: input.quantity,
        unitPrice: input.partSupply.salePrice,
      }),
    );

    this._services = [...this._services, ...serviceItems];
    this._partsSupplies = [...this._partsSupplies, ...partItems];

    this.recalculateTotals();
  }

  private ensureNoDuplicateServiceIds(newItems: CreateQuoteItemServiceProps[]): void {
    const newIds = newItems.map((s) => s.service.id);

    const hasBatchDuplicate = newIds.some((id, i) => newIds.indexOf(id) !== i);

    if (hasBatchDuplicate) {
      throw new BusinessRuleViolationException('O orçamento não pode conter serviços duplicados.');
    }

    const existingIds = new Set(this._services.map((s) => s.serviceId));
    const hasConflict = newIds.some((id) => existingIds.has(id));

    if (hasConflict) {
      throw new BusinessRuleViolationException('O orçamento não pode conter serviços duplicados.');
    }
  }

  private ensureNoDuplicatePartIds(newItems: CreateQuoteItemPartSupplyProps[]): void {
    const newIds = newItems.map((p) => p.partSupply.id);
    const hasBatchDuplicate = newIds.some((id, i) => newIds.indexOf(id) !== i);

    if (hasBatchDuplicate) {
      throw new BusinessRuleViolationException(
        'O orçamento não pode conter peças/insumos duplicados.',
      );
    }

    const existingIds = new Set(this._partsSupplies.map((p) => p.partSupplyId));
    const hasConflict = newIds.some((id) => existingIds.has(id));

    if (hasConflict) {
      throw new BusinessRuleViolationException(
        'O orçamento não pode conter peças/insumos duplicados.',
      );
    }
  }

  approve(): void {
    this.ensureCanApprove();

    const now = new Date();

    this._status = QuoteStatus.APPROVED;
    this.approvedAt = now;
    this.updatedAt = now;
  }

  reject(): void {
    this.ensureCanReject();

    const now = new Date();

    this._status = QuoteStatus.REJECTED;
    this.rejectedAt = now;
    this.updatedAt = now;
  }

  private recalculateTotals(): void {
    const servicesAmount = this._services.reduce((sum, s) => sum + s.totalPrice, 0);

    const partsAmount = this._partsSupplies.reduce((sum, p) => sum + p.totalPrice, 0);

    this._servicesAmount = servicesAmount;
    this._partsAmount = partsAmount;
    this._totalAmount = servicesAmount + partsAmount;
    this.updatedAt = new Date();
  }

  private canChangeItems(): boolean {
    return this.status === QuoteStatus.PENDING;
  }

  private ensureCanChangeItems(): void {
    if (!this.canChangeItems()) {
      throw new BusinessRuleViolationException(
        `Não é possível alterar itens em um orçamento que não está pendente.`,
      );
    }
  }

  private canSubmit(): boolean {
    return this.status === QuoteStatus.PENDING;
  }

  private ensureCanSubmit(): void {
    if (!this.canSubmit()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser enviado se estiver no status PENDING. Status atual: "${this.status}".`,
      );
    }
  }

  private ensureHasService(): void {
    if (this._services.length === 0) {
      throw new BusinessRuleViolationException(
        'O orçamento deve ter pelo menos um serviço antes de ser enviado.',
      );
    }
  }

  private canApprove(): boolean {
    return this.status === QuoteStatus.SENT;
  }

  private ensureCanApprove(): void {
    if (!this.canApprove()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser aprovado se estiver no status SENT. Status atual: "${this.status}".`,
      );
    }
  }

  private canReject(): boolean {
    return this.status === QuoteStatus.SENT;
  }

  private ensureCanReject(): void {
    if (!this.canReject()) {
      throw new BusinessRuleViolationException(
        `Orçamento só pode ser rejeitado se estiver no status SENT. Status atual: "${this.status}".`,
      );
    }
  }

  private static validateItems(props: CreateQuoteProps): void {
    const hasServices = (props.services?.length ?? 0) > 0;
    const hasParts = (props.partsSupplies?.length ?? 0) > 0;

    if (hasParts && !hasServices) {
      throw new BusinessRuleViolationException(
        'O orçamento deve ter pelo menos um serviço quando contém peças/insumos.',
      );
    }
  }

  private static validateWorkOrderId(workOrderId: string): void {
    if (!workOrderId?.trim()) {
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

  get servicesAmount(): number {
    return this._servicesAmount;
  }

  get partsAmount(): number {
    return this._partsAmount;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get status(): QuoteStatus {
    return this._status;
  }

  get services(): QuoteService[] {
    return this._services;
  }

  get partsSupplies(): QuotePartSupply[] {
    return this._partsSupplies;
  }
}
