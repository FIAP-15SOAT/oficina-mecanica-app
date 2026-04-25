import { validate as isUuid } from 'uuid';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { Customer } from './customer.entity';

const MIN_BRAND_LENGTH = 2;
const MAX_BRAND_LENGTH = 60;
const MIN_MODEL_LENGTH = 2;
const MAX_MODEL_LENGTH = 60;
const MAX_COLOR_LENGTH = 40;
const MIN_YEAR = 1950;

const OLD_PLATE_REGEX = /^[A-Z]{3}-\d{4}$/;
const MERCOSUL_PLATE_REGEX = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export interface CreateVehicleProps {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
}

export class Vehicle {
  id!: string;
  customerId!: string;
  plate!: string;
  brand!: string;
  model!: string;
  year!: number;
  color!: string | null;
  mileage!: number | null;
  customer?: Customer;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(partial: Partial<Vehicle>) {
    Object.assign(this, partial);
  }

  static create(props: CreateVehicleProps): Vehicle {
    const vehicle = new Vehicle({
      id: crypto.randomUUID(),
      customerId: props.customerId,
      plate: props.plate.trim().toUpperCase(),
      brand: props.brand.trim(),
      model: props.model.trim(),
      year: props.year,
      color: props.color?.trim() ?? null,
      mileage: props.mileage ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vehicle.validateCustomerId();
    vehicle.validatePlate();
    vehicle.validateBrand();
    vehicle.validateModel();
    vehicle.validateYear();
    vehicle.validateColor();
    vehicle.validateMileage();

    return vehicle;
  }

  private validateCustomerId(): void {
    if (!this.customerId) {
      throw new DomainValidationException('ID do cliente é obrigatório');
    }
    if (!isUuid(this.customerId)) {
      throw new DomainValidationException('ID do cliente deve ser um UUID válido');
    }
  }

  private validatePlate(): void {
    if (!this.plate) {
      throw new DomainValidationException('Placa é obrigatória');
    }
    if (!OLD_PLATE_REGEX.test(this.plate) && !MERCOSUL_PLATE_REGEX.test(this.plate)) {
      throw new DomainValidationException(
        'Placa inválida. Use o formato antigo (ABC-1234) ou Mercosul (ABC1D23)',
      );
    }
  }

  private validateBrand(): void {
    if (!this.brand) {
      throw new DomainValidationException('Marca é obrigatória');
    }
    if (this.brand.length < MIN_BRAND_LENGTH) {
      throw new DomainValidationException(`Marca deve ter no mínimo ${MIN_BRAND_LENGTH} caracteres`);
    }
    if (this.brand.length > MAX_BRAND_LENGTH) {
      throw new DomainValidationException(`Marca deve ter no máximo ${MAX_BRAND_LENGTH} caracteres`);
    }
  }

  private validateModel(): void {
    if (!this.model) {
      throw new DomainValidationException('Modelo é obrigatório');
    }
    if (this.model.length < MIN_MODEL_LENGTH) {
      throw new DomainValidationException(`Modelo deve ter no mínimo ${MIN_MODEL_LENGTH} caracteres`);
    }
    if (this.model.length > MAX_MODEL_LENGTH) {
      throw new DomainValidationException(`Modelo deve ter no máximo ${MAX_MODEL_LENGTH} caracteres`);
    }
  }

  private validateYear(): void {
    const currentYear = new Date().getFullYear();
    if (this.year < MIN_YEAR || this.year > currentYear) {
      throw new DomainValidationException(
        `Ano do veículo deve ser entre ${MIN_YEAR} e ${currentYear}`,
      );
    }
  }

  private validateColor(): void {
    if (this.color !== null && this.color.length > MAX_COLOR_LENGTH) {
      throw new DomainValidationException(`Cor deve ter no máximo ${MAX_COLOR_LENGTH} caracteres`);
    }
  }

  private validateMileage(): void {
    if (this.mileage !== null && this.mileage < 0) {
      throw new DomainValidationException('Quilometragem não pode ser negativa');
    }
  }
}
