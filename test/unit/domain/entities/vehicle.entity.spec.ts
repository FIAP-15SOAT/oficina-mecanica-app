import { Vehicle } from '@domain/entities/vehicle.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { randomUUID } from 'crypto';

describe('Vehicle Entity', () => {
  const customerId = randomUUID();
  const validProps = {
    customerId,
    plate: 'ABC-1234',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a vehicle with all required fields', () => {
        const v = Vehicle.create(validProps);
        expect(v.id).toBeDefined();
        expect(v.customerId).toBe(customerId);
        expect(v.plate).toBe('ABC-1234');
        expect(v.brand).toBe('Toyota');
        expect(v.model).toBe('Corolla');
        expect(v.year).toBe(2020);
        expect(v.color).toBeNull();
        expect(v.mileage).toBeNull();
        expect(v.createdAt).toBeInstanceOf(Date);
        expect(v.updatedAt).toBeInstanceOf(Date);
      });

      it('should accept Mercosul plate format', () => {
        const v = Vehicle.create({ ...validProps, plate: 'ABC1D23' });
        expect(v.plate).toBe('ABC1D23');
      });

      it('should normalize plate to uppercase', () => {
        const v = Vehicle.create({ ...validProps, plate: 'abc-1234' });
        expect(v.plate).toBe('ABC-1234');
      });

      it('should accept optional color and mileage', () => {
        const v = Vehicle.create({ ...validProps, color: 'Vermelho', mileage: 50000 });
        expect(v.color).toBe('Vermelho');
        expect(v.mileage).toBe(50000);
      });

      it('should default color and mileage to null when not provided', () => {
        const v = Vehicle.create(validProps);
        expect(v.color).toBeNull();
        expect(v.mileage).toBeNull();
      });
    });

    describe('plate validation', () => {
      it('should throw for invalid plate format', () => {
        expect(() => Vehicle.create({ ...validProps, plate: '1234ABC' }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, plate: '1234ABC' }))
          .toThrow('Placa inválida');
      });
    });

    describe('brand validation', () => {
      it('should throw if brand is too short (< 2 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, brand: 'A' }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, brand: 'A' }))
          .toThrow('Marca deve ter no mínimo 2 caracteres');
      });

      it('should throw if brand is too long (> 60 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, brand: 'A'.repeat(61) }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, brand: 'A'.repeat(61) }))
          .toThrow('Marca deve ter no máximo 60 caracteres');
      });
    });

    describe('model validation', () => {
      it('should throw if model is too short (< 2 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, model: 'X' }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, model: 'X' }))
          .toThrow('Modelo deve ter no mínimo 2 caracteres');
      });

      it('should throw if model is too long (> 60 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, model: 'M'.repeat(61) }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, model: 'M'.repeat(61) }))
          .toThrow('Modelo deve ter no máximo 60 caracteres');
      });
    });

    describe('year validation', () => {
      it('should throw if year is before 1950', () => {
        expect(() => Vehicle.create({ ...validProps, year: 1949 }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, year: 1949 }))
          .toThrow('Ano do veículo deve ser entre 1950');
      });

      it('should throw if year is after current year', () => {
        const futureYear = new Date().getFullYear() + 1;
        expect(() => Vehicle.create({ ...validProps, year: futureYear }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, year: futureYear }))
          .toThrow('Ano do veículo deve ser entre 1950');
      });
    });

    describe('mileage validation', () => {
      it('should throw if mileage is negative', () => {
        expect(() => Vehicle.create({ ...validProps, mileage: -1 }))
          .toThrow(DomainValidationException);
        expect(() => Vehicle.create({ ...validProps, mileage: -1 }))
          .toThrow('Quilometragem não pode ser negativa');
      });
    });
  });
});
