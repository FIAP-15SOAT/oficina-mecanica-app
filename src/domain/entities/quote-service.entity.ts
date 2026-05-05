import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { validate as isUuid } from 'uuid';

export interface CreateQuoteServiceProps {
  quoteId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteServiceProps {
  quoteId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export class QuoteService {
  readonly quoteId: string;
  readonly serviceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: QuoteServiceProps) {
    this.quoteId = props.quoteId;
    this.serviceId = props.serviceId;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.totalPrice = props.totalPrice;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: QuoteServiceProps): QuoteService {
    return new QuoteService(props);
  }

  static create(props: CreateQuoteServiceProps): QuoteService {
    QuoteService.validateQuoteId(props.quoteId);
    QuoteService.validateServiceId(props.serviceId);
    QuoteService.validateQuantity(props.quantity);
    QuoteService.validateUnitPrice(props.unitPrice);

    const now = new Date();

    return new QuoteService({
      quoteId: props.quoteId,
      serviceId: props.serviceId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: now,
      updatedAt: now,
    });
  }

  updateQuantity(quantity: number): void {
    QuoteService.validateQuantity(quantity);
    this.quantity = quantity;
    this.totalPrice = this.quantity * this.unitPrice;
    this.updatedAt = new Date();
  }

  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity)) {
      throw new DomainValidationException('Quantidade deve ser um número inteiro');
    }
    if (quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser maior que zero');
    }
  }

  private static validateQuoteId(quoteId: string): void {
    if (!quoteId || !quoteId.trim()) {
      throw new DomainValidationException('ID do orçamento é obrigatório');
    }

    if (!isUuid(quoteId.trim())) {
      throw new DomainValidationException('ID do orçamento deve ser um UUID válido');
    }
  }

  private static validateServiceId(serviceId: string): void {
    if (!serviceId || !serviceId.trim()) {
      throw new DomainValidationException('ID do serviço é obrigatório');
    }

    if (!isUuid(serviceId.trim())) {
      throw new DomainValidationException('ID do serviço deve ser um UUID válido');
    }
  }

  private static validateUnitPrice(unitPrice: number): void {
    if (!Number.isFinite(unitPrice)) {
      throw new DomainValidationException('Preço unitário inválido');
    }

    if (unitPrice <= 0) {
      throw new DomainValidationException('Preço unitário deve ser maior que zero');
    }
  }
}
