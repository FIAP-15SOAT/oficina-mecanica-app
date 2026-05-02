import { randomUUID } from 'crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 500;

export class Service {
  id!: string;
  name!: string;
  description?: string | null;
  basePrice!: number;
  estimatedTimeMin!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Service>) {
    Object.assign(this, partial);
  }

  static create(props: {
    name: string;
    description?: string | null;
    basePrice: number;
    estimatedTimeMin: number;
    isActive?: boolean;
  }): Service {
    const now = new Date();

    const service = new Service({
      id: randomUUID(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      basePrice: props.basePrice,
      estimatedTimeMin: props.estimatedTimeMin,
      isActive: props.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    service.validateName();
    service.validateDescription();
    service.validateBasePrice();
    service.validateEstimatedTimeMin();

    return service;
  }

  activate(): void {
    if (this.isActive) {
      throw new DomainValidationException('Serviço já está ativo');
    }

    this.isActive = true;
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new DomainValidationException('Serviço já está desativado');
    }

    this.isActive = false;
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

  private validateDescription(): void {
    if (this.description === null || this.description === undefined) {
      return;
    }

    if (this.description.length > MAX_DESCRIPTION_LENGTH) {
      throw new DomainValidationException(
        `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`,
      );
    }
  }

  private validateBasePrice(): void {
    if (!Number.isFinite(this.basePrice)) {
      throw new DomainValidationException('Preço base inválido');
    }

    if (this.basePrice <= 0) {
      throw new DomainValidationException('Preço base deve ser maior que zero');
    }
  }

  private validateEstimatedTimeMin(): void {
    if (!Number.isInteger(this.estimatedTimeMin)) {
      throw new DomainValidationException('Tempo estimado deve ser um número inteiro');
    }

    if (this.estimatedTimeMin <= 0) {
      throw new DomainValidationException('Tempo estimado deve ser maior que zero');
    }
  }
}
