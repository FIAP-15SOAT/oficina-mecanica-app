import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { validate as isUuid } from 'uuid';

export interface CreateQuotePartSupplyProps {
  quoteId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
}

interface QuotePartSupplyProps {
  quoteId: string;
  partSupplyId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export class QuotePartSupply {
  readonly quoteId: string;
  readonly partSupplyId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: QuotePartSupplyProps) {
    this.quoteId = props.quoteId;
    this.partSupplyId = props.partSupplyId;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.totalPrice = props.totalPrice;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: QuotePartSupplyProps): QuotePartSupply {
    return new QuotePartSupply(props);
  }

  static create(props: CreateQuotePartSupplyProps): QuotePartSupply {
    QuotePartSupply.validateQuoteId(props.quoteId);
    QuotePartSupply.validatePartSupplyId(props.partSupplyId);
    QuotePartSupply.validateQuantity(props.quantity);
    QuotePartSupply.validateUnitPrice(props.unitPrice);

    const now = new Date();

    return new QuotePartSupply({
      quoteId: props.quoteId,
      partSupplyId: props.partSupplyId,
      quantity: props.quantity,
      unitPrice: props.unitPrice,
      totalPrice: props.quantity * props.unitPrice,
      createdAt: now,
      updatedAt: now,
    });
  }

  updateQuantity(quantity: number): void {
    QuotePartSupply.validateQuantity(quantity);

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

  private static validatePartSupplyId(partSupplyId: string): void {
    if (!partSupplyId || !partSupplyId.trim()) {
      throw new DomainValidationException('ID da peça/insumo é obrigatório');
    }

    if (!isUuid(partSupplyId.trim())) {
      throw new DomainValidationException('ID da peça/insumo deve ser um UUID válido');
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
