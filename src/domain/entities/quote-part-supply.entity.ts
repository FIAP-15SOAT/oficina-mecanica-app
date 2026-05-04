import { DomainValidationException } from '../exceptions/domain-validation.exception';

export interface CreateQuotePartSupplyProps {
  quoteId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
}

export class QuotePartSupply {
  quoteId!: string;
  partSupplyId!: string;
  quantity!: number;
  unitPrice!: number;
  totalPrice!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<QuotePartSupply>) {
    Object.assign(this, partial);
  }

  static create(props: CreateQuotePartSupplyProps): QuotePartSupply {
    const entity = new QuotePartSupply({
      quoteId: props.quoteId,
      partSupplyId: props.partSupplyId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    entity.validateQuantity();
    entity.validateUnitPrice();

    return entity;
  }

  updateQuantity(quantity: number): void {
    this.quantity = quantity;
    this.validateQuantity();
    this.totalPrice = this.quantity * this.unitPrice;
    this.updatedAt = new Date();
  }


  private validateQuantity(): void {
    if (!Number.isInteger(this.quantity)) {
      throw new DomainValidationException('Quantidade deve ser um número inteiro');
    }

    if (this.quantity <= 0) {
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
