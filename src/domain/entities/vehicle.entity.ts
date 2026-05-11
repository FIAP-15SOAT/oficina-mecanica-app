import { validate as isUuid } from 'uuid';
import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { Customer } from './customer.entity';
import { Plate } from '../value-objects/plate.vo';

import {
  MIN_BRAND_LENGTH,
  MAX_BRAND_LENGTH,
  MIN_MODEL_LENGTH,
  MAX_MODEL_LENGTH,
  MAX_COLOR_LENGTH,
  MIN_YEAR,
} from '../constants/validation/vehicle.constants';

export interface CreateVehicleProps {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
}

export interface UpdateVehicleProps {
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  mileage?: number | null;
}

export class Vehicle {
  readonly id: string;
  customerId: string;
  plate: Plate;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  mileage: number | null;
  customer?: Customer;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: {
    id: string;
    customerId: string;
    plate: Plate;
    brand: string;
    model: string;
    year: number;
    color: string | null;
    mileage: number | null;
    customer?: Customer;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.customerId = props.customerId;
    this.plate = props.plate;
    this.brand = props.brand;
    this.model = props.model;
    this.year = props.year;
    this.color = props.color;
    this.mileage = props.mileage;
    this.customer = props.customer;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: {
    id: string;
    customerId: string;
    plate: Plate;
    brand: string;
    model: string;
    year: number;
    color: string | null;
    mileage: number | null;
    customer?: Customer;
    createdAt: Date;
    updatedAt: Date;
  }): Vehicle {
    return new Vehicle(props);
  }

  static create(props: CreateVehicleProps): Vehicle {
    Vehicle.validateProps(props);

    const plate = Plate.create(props.plate);

    return new Vehicle({
      id: randomUUID(),
      customerId: props.customerId,
      plate,
      brand: props.brand?.trim(),
      model: props.model?.trim(),
      year: props.year,
      color: props.color?.trim() ?? null,
      mileage: props.mileage ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(props: UpdateVehicleProps): void {
    Vehicle.validateProps(props);

    const plate = Plate.create(props.plate);

    this.customerId = props.customerId;
    this.plate = plate;
    this.brand = props.brand?.trim();
    this.model = props.model?.trim();
    this.year = props.year;
    this.color = props.color?.trim() ?? null;
    this.mileage = props.mileage ?? null;
    this.updatedAt = new Date();
  }

  private static validateProps(props: CreateVehicleProps | UpdateVehicleProps): void {
    Vehicle.validateCustomerId(props.customerId);
    Vehicle.validateBrand(props.brand);
    Vehicle.validateModel(props.model);
    Vehicle.validateYear(props.year);
    Vehicle.validateColor(props.color ?? null);
    Vehicle.validateMileage(props.mileage ?? null);
  }

  private static validateCustomerId(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('ID do cliente é obrigatório');
    }

    if (!isUuid(value.trim())) {
      throw new DomainValidationException('ID do cliente deve ser um UUID válido');
    }
  }

  private static validateBrand(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Marca é obrigatória');
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_BRAND_LENGTH) {
      throw new DomainValidationException(
        `Marca deve ter no mínimo ${MIN_BRAND_LENGTH} caracteres`,
      );
    }

    if (trimmed.length > MAX_BRAND_LENGTH) {
      throw new DomainValidationException(
        `Marca deve ter no máximo ${MAX_BRAND_LENGTH} caracteres`,
      );
    }
  }

  private static validateModel(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new DomainValidationException('Modelo é obrigatório');
    }

    const trimmed = value.trim();

    if (trimmed.length < MIN_MODEL_LENGTH) {
      throw new DomainValidationException(
        `Modelo deve ter no mínimo ${MIN_MODEL_LENGTH} caracteres`,
      );
    }

    if (trimmed.length > MAX_MODEL_LENGTH) {
      throw new DomainValidationException(
        `Modelo deve ter no máximo ${MAX_MODEL_LENGTH} caracteres`,
      );
    }
  }

  private static validateYear(value: number): void {
    const currentYear = new Date().getFullYear();

    if (value < MIN_YEAR || value > currentYear) {
      throw new DomainValidationException(
        `Ano do veículo deve ser entre ${MIN_YEAR} e ${currentYear}`,
      );
    }
  }

  private static validateColor(value: string | null): void {
    if (value !== null && value.trim().length > MAX_COLOR_LENGTH) {
      throw new DomainValidationException(`Cor deve ter no máximo ${MAX_COLOR_LENGTH} caracteres`);
    }
  }

  private static validateMileage(value: number | null): void {
    if (value !== null && value < 0) {
      throw new DomainValidationException('Quilometragem não pode ser negativa');
    }
  }
}
