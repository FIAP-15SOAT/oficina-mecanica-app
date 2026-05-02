import { DomainValidationException } from '../exceptions/domain-validation.exception';

export interface CreateQuoteServiceProps {
  quoteId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
}

export class QuoteService {
  quoteId!: string;
  serviceId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<QuoteService>) {
    Object.assign(this, partial);
  }

  static create(props: CreateQuoteServiceProps): QuoteService {
    const entity = new QuoteService({
      quoteId: props.quoteId,
      serviceId: props.serviceId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    entity.validateQuantity(props.quantity);
    entity.validateUnitPrice();

    return entity;
  }

  updateQuantity(quantity: number): void {
    this.quantity = quantity;
    this.validateQuantity(this.quantity);
    this.totalPrice = this.quantity * this.unitPrice;
    this.updatedAt = new Date();
  }


  private validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity)) {
      throw new DomainValidationException('Quantidade deve ser um número inteiro');
    }
    if (quantity <= 0) {
      throw new DomainValidationException('Quantidade deve ser maior que zero');
    }
  }

  private validateUnitPrice(): void {
    if (!Number.isFinite(this.unitPrice)) {
      throw new DomainValidationException('Preço unitário inválido');
    }

    if (this.unitPrice <= 0) {
      throw new DomainValidationException('Preço unitário deve ser maior que zero');
    }
  }
}
