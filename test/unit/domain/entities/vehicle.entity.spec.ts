import { Vehicle } from '@domain/entities/vehicle.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { randomUUID } from 'node:crypto';

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
        expect(v.plate.value).toBe('ABC1234');
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
        expect(v.plate.value).toBe('ABC1D23');
      });

      it('should normalize plate to uppercase and strip dashes', () => {
        const v = Vehicle.create({ ...validProps, plate: 'abc-1234' });
        expect(v.plate.value).toBe('ABC1234');
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

    describe('customerId validation', () => {
      it('should throw if customerId is empty', () => {
        expect(() => Vehicle.create({ ...validProps, customerId: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, customerId: '' })).toThrow(
          'ID do cliente é obrigatório',
        );
      });

      it('should throw if customerId is missing', () => {
        expect(() =>
          Vehicle.create({ ...validProps, customerId: undefined as unknown as string }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Vehicle.create({ ...validProps, customerId: undefined as unknown as string }),
        ).toThrow('ID do cliente é obrigatório');
      });

      it('should throw if customerId is not a valid UUID', () => {
        expect(() => Vehicle.create({ ...validProps, customerId: 'invalid-uuid' })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, customerId: 'invalid-uuid' })).toThrow(
          'ID do cliente deve ser um UUID válido',
        );
      });
    });

    describe('plate validation', () => {
      it('should throw for invalid plate format', () => {
        expect(() => Vehicle.create({ ...validProps, plate: '1234ABC' })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, plate: '1234ABC' })).toThrow('Placa inválida');
      });

      it('should throw if plate is missing', () => {
        expect(() =>
          Vehicle.create({ ...validProps, plate: undefined as unknown as string }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Vehicle.create({ ...validProps, plate: undefined as unknown as string }),
        ).toThrow('Placa é obrigatória');
      });
    });

    describe('brand validation', () => {
      it('should throw if brand is too short (< 2 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, brand: 'A' })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, brand: 'A' })).toThrow(
          'Marca deve ter no mínimo 2 caracteres',
        );
      });

      it('should throw if brand is too long (> 60 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, brand: 'A'.repeat(61) })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, brand: 'A'.repeat(61) })).toThrow(
          'Marca deve ter no máximo 60 caracteres',
        );
      });

      it('should throw if brand is missing', () => {
        expect(() =>
          Vehicle.create({ ...validProps, brand: undefined as unknown as string }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Vehicle.create({ ...validProps, brand: undefined as unknown as string }),
        ).toThrow('Marca é obrigatória');
      });
    });

    describe('model validation', () => {
      it('should throw if model is too short (< 2 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, model: 'X' })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, model: 'X' })).toThrow(
          'Modelo deve ter no mínimo 2 caracteres',
        );
      });

      it('should throw if model is too long (> 60 chars)', () => {
        expect(() => Vehicle.create({ ...validProps, model: 'M'.repeat(61) })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, model: 'M'.repeat(61) })).toThrow(
          'Modelo deve ter no máximo 60 caracteres',
        );
      });

      it('should throw if model is missing', () => {
        expect(() =>
          Vehicle.create({ ...validProps, model: undefined as unknown as string }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Vehicle.create({ ...validProps, model: undefined as unknown as string }),
        ).toThrow('Modelo é obrigatório');
      });
    });

    describe('year validation', () => {
      it('should throw if year is before 1950', () => {
        expect(() => Vehicle.create({ ...validProps, year: 1949 })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, year: 1949 })).toThrow(
          'Ano do veículo deve ser entre 1950',
        );
      });

      it('should throw if year is after current year', () => {
        const futureYear = new Date().getFullYear() + 1;
        expect(() => Vehicle.create({ ...validProps, year: futureYear })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, year: futureYear })).toThrow(
          'Ano do veículo deve ser entre 1950',
        );
      });
    });

    describe('mileage validation', () => {
      it('should throw if mileage is negative', () => {
        expect(() => Vehicle.create({ ...validProps, mileage: -1 })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, mileage: -1 })).toThrow(
          'Quilometragem não pode ser negativa',
        );
      });
    });

    describe('color validation', () => {
      it('should throw if color exceeds 40 chars', () => {
        expect(() => Vehicle.create({ ...validProps, color: 'A'.repeat(41) })).toThrow(
          DomainValidationException,
        );
        expect(() => Vehicle.create({ ...validProps, color: 'A'.repeat(41) })).toThrow(
          'Cor deve ter no máximo 40 caracteres',
        );
      });
    });
  });

  describe('update (domain command)', () => {
    const updateProps = {
      customerId,
      plate: 'XYZ-9999',
      brand: 'Honda',
      model: 'Civic',
      year: 2022,
      color: 'Azul',
      mileage: 15000,
    };

    it('should update vehicle fields successfully', () => {
      const vehicle = Vehicle.create(validProps);

      vehicle.update(updateProps);

      expect(vehicle.customerId).toBe(customerId);
      expect(vehicle.plate.value).toBe('XYZ9999');
      expect(vehicle.brand).toBe('Honda');
      expect(vehicle.model).toBe('Civic');
      expect(vehicle.year).toBe(2022);
      expect(vehicle.color).toBe('Azul');
      expect(vehicle.mileage).toBe(15000);
    });

    it('should update updatedAt on successful update', () => {
      const vehicle = Vehicle.create(validProps);
      const before = vehicle.updatedAt;

      vehicle.update(updateProps);

      expect(vehicle.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should preserve original state when validation fails (fail-fast)', () => {
      const vehicle = Vehicle.create(validProps);
      const originalBrand = vehicle.brand;
      const originalPlate = vehicle.plate.value;

      expect(() => vehicle.update({ ...updateProps, customerId: 'invalid-uuid' })).toThrow(
        DomainValidationException,
      );

      // state must be unchanged
      expect(vehicle.brand).toBe(originalBrand);
      expect(vehicle.plate.value).toBe(originalPlate);
    });

    it('should throw if brand is invalid during update', () => {
      const vehicle = Vehicle.create(validProps);

      expect(() => vehicle.update({ ...updateProps, brand: 'A' })).toThrow(
        DomainValidationException,
      );
      expect(() => vehicle.update({ ...updateProps, brand: 'A' })).toThrow(
        'Marca deve ter no mínimo 2 caracteres',
      );
    });

    it('should throw if year is invalid during update', () => {
      const vehicle = Vehicle.create(validProps);

      expect(() => vehicle.update({ ...updateProps, year: 1900 })).toThrow(
        DomainValidationException,
      );
    });

    it('should throw if plate is invalid during update', () => {
      const vehicle = Vehicle.create(validProps);

      expect(() => vehicle.update({ ...updateProps, plate: 'invalid' })).toThrow(
        DomainValidationException,
      );
    });
  });
});
