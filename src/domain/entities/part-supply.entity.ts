import { randomUUID } from 'crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { BusinessRuleViolationException } from '../exceptions/business-rule-violation.exception';
import { PartSupplyCategory } from '../enums/part-supply-category.enum';
import { Unit } from '../enums/unit.enum';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 150;
const MAX_SKU_LENGTH = 60;
const MAX_PART_NUMBER_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 500;

export interface CreatePartSupplyProps {
  name: string;
  description?: string;
  sku: string;
  partNumber?: string;
  category: PartSupplyCategory;
  unit: Unit;
  costPrice: number;
  salePrice: number;
  stock?: number;
  minStock?: number;
  expiresAt?: Date;
}

export class PartSupply {
  id!: string;
  name!: string;
  description?: string | null;
  sku!: string;
  partNumber?: string | null;
  category!: PartSupplyCategory;
  unit!: Unit;
  costPrice!: number;
  salePrice!: number;
  stock!: number;
  minStock!: number;
  reservedStock!: number;
  expiresAt?: Date | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<PartSupply>) {
    Object.assign(this, partial);
  }

  static create(props: CreatePartSupplyProps): PartSupply {
    const partSupply = new PartSupply({
      id: randomUUID(),
      name: props.name.trim(),
      description: props.description?.trim() ?? undefined,
      sku: props.sku.trim(),
      partNumber: props.partNumber?.trim() ?? undefined,
      category: props.category,
      unit: props.unit,
      costPrice: props.costPrice,
      salePrice: props.salePrice,
      stock: props.stock ?? 0,
      minStock: props.minStock ?? 0,
      reservedStock: 0,
      expiresAt: props.expiresAt,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    partSupply.validateName();
    partSupply.validateSku();
    partSupply.validatePartNumber();
    partSupply.validateDescription();
    partSupply.validateCostPrice();
    partSupply.validateSalePrice();
    partSupply.validateStock();
    partSupply.validateMinStock();
    partSupply.validateExpiresAt();

    return partSupply;
  }

  activate(): void {
    if (this.isActive) {
      throw new DomainValidationException('Peça ou Insumo já está ativo');
    }

    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainValidationException('Peça ou Insumo já está desativado');
    }

    this.isActive = false;
    this.updatedAt = new Date();
  }

  setActive(active: boolean): void {
    if (active) {
      this.activate();
      return;
    }

    this.deactivate();
  }

  private validateName(): void {
    if (!this.name) {
      throw new DomainValidationException('Nome é obrigatório');
    }

    if (this.name.length < MIN_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no mínimo ${MIN_NAME_LENGTH} caracteres`);
    }

    if (this.name.length > MAX_NAME_LENGTH) {
      throw new DomainValidationException(`Nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`);
    }
  }

  private validateSku(): void {
    if (!this.sku) {
      throw new DomainValidationException('SKU é obrigatório');
    }

    if (this.sku.length > MAX_SKU_LENGTH) {
      throw new DomainValidationException(`SKU deve ter no máximo ${MAX_SKU_LENGTH} caracteres`);
    }
  }

  private validatePartNumber(): void {
    if (!this.partNumber) return;

    if (this.partNumber.length > MAX_PART_NUMBER_LENGTH) {
      throw new DomainValidationException(
        `Número de referência deve ter no máximo ${MAX_PART_NUMBER_LENGTH} caracteres`,
      );
    }
  }

  private validateDescription(): void {
    if (!this.description) return;

    if (this.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new DomainValidationException(
        `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`,
      );
    }
  }

  private validateCostPrice(): void {
    if (!Number.isFinite(this.costPrice)) {
      throw new DomainValidationException('Preço de custo inválido');
    }

    if (this.costPrice <= 0) {
      throw new DomainValidationException('Preço de custo deve ser maior que zero');
    }
  }

  private validateSalePrice(): void {
    if (!Number.isFinite(this.salePrice)) {
      throw new DomainValidationException('Preço de venda inválido');
    }

    if (this.salePrice <= 0) {
      throw new DomainValidationException('Preço de venda deve ser maior que zero');
    }
  }

  private validateStock(): void {
    if (!Number.isInteger(this.stock)) {
      throw new DomainValidationException('Estoque deve ser um número inteiro');
    }

    if (this.stock < 0) {
      throw new DomainValidationException('Estoque não pode ser negativo');
    }
  }

  private validateMinStock(): void {
    if (!Number.isInteger(this.minStock)) {
      throw new DomainValidationException('Estoque mínimo deve ser um número inteiro');
    }

    if (this.minStock < 0) {
      throw new DomainValidationException('Estoque mínimo não pode ser negativo');
    }
  }

  private validateExpiresAt(): void {
    if (!this.expiresAt) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (this.expiresAt < today) {
      throw new DomainValidationException('Data de validade não pode ser anterior a hoje.');
    }
  }

  ensureCanDelete(): void {
    if (this.reservedStock > 0) {
      throw new BusinessRuleViolationException(
        'Não é possível excluir uma peça/insumo com estoque reservado.',
      );
    }
  }

  ensureHasSufficientStock(requestedQuantity: number): void {
    const available = this.stock - (this.reservedStock ?? 0);

    if (available < requestedQuantity) {
      throw new BusinessRuleViolationException(
        `Estoque insuficiente para a peça/insumo "${this.name}". Disponível: ${available}, Solicitado: ${requestedQuantity}`,
      );
    }
  }
}
