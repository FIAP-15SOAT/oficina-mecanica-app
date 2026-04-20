import { Address } from '@domain/entities/address.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Address Entity', () => {
  const validProps = {
    id: 'address-uuid-123',
    customerId: 'customer-uuid-456',
    street: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('constructor', () => {
    it('should create an address with all fields', () => {
      const address = new Address(validProps);

      expect(address.id).toBe(validProps.id);
      expect(address.customerId).toBe(validProps.customerId);
      expect(address.street).toBe(validProps.street);
      expect(address.city).toBe(validProps.city);
      expect(address.state).toBe(validProps.state);
      expect(address.zipCode).toBe(validProps.zipCode);
      expect(address.createdAt).toBe(validProps.createdAt);
      expect(address.updatedAt).toBe(validProps.updatedAt);
    });

    it('should create an address with partial fields', () => {
      const address = new Address({ street: 'Av. Paulista', city: 'São Paulo' });

      expect(address.street).toBe('Av. Paulista');
      expect(address.city).toBe('São Paulo');
      expect(address.id).toBeUndefined();
    });

    it('should create an empty address without errors', () => {
      expect(() => new Address({})).not.toThrow();
    });
  });

  describe('static create', () => {
    const createProps = {
      customerId: 'customer-uuid-456',
      street: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    };

    it('should create a valid address with all required fields', () => {
      const address = Address.create(createProps);

      expect(address.customerId).toBe(createProps.customerId);
      expect(address.street).toBe(createProps.street);
      expect(address.city).toBe(createProps.city);
      expect(address.state).toBe('SP');
      expect(address.zipCode).toBe(createProps.zipCode);
    });

    it('should normalize state to uppercase', () => {
      const address = Address.create({ ...createProps, state: 'sp' });

      expect(address.state).toBe('SP');
    });

    it('should trim text fields', () => {
      const address = Address.create({
        ...createProps,
        street: '  Rua das Flores, 123  ',
        city: '  São Paulo  ',
        state: ' sp ',
        zipCode: ' 01310-100 ',
      });

      expect(address.street).toBe('Rua das Flores, 123');
      expect(address.city).toBe('São Paulo');
      expect(address.state).toBe('SP');
      expect(address.zipCode).toBe('01310-100');
    });

    describe('validações', () => {
      it('should throw exception when customerId is empty', () => {
        expect(() => Address.create({ ...createProps, customerId: '' })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when street is empty', () => {
        expect(() => Address.create({ ...createProps, street: '' })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when street exceeds 255 characters', () => {
        expect(() => Address.create({ ...createProps, street: 'a'.repeat(256) })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when city is empty', () => {
        expect(() => Address.create({ ...createProps, city: '' })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when city exceeds 100 characters', () => {
        expect(() => Address.create({ ...createProps, city: 'a'.repeat(101) })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when state does not have exactly 2 characters', () => {
        expect(() => Address.create({ ...createProps, state: 'SPP' })).toThrow(
          DomainValidationException,
        );
        expect(() => Address.create({ ...createProps, state: 'S' })).toThrow(
          DomainValidationException,
        );
      });

      it('should throw exception when zipCode has invalid format', () => {
        expect(() => Address.create({ ...createProps, zipCode: '01310100' })).toThrow(
          DomainValidationException,
        );
        expect(() => Address.create({ ...createProps, zipCode: '0131-0100' })).toThrow(
          DomainValidationException,
        );
        expect(() => Address.create({ ...createProps, zipCode: '' })).toThrow(
          DomainValidationException,
        );
      });
    });
  });
});
