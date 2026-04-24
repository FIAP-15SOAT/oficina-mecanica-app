import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Customer Entity', () => {
  const validProps = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '(11) 99999-9999',
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a valid customer with all required fields', () => {
        const customer = Customer.create(validProps);
        expect(customer.name).toBe('João da Silva');
        expect(customer.document).toBe('123.456.789-09');
        expect(customer.type).toBe(CustomerType.INDIVIDUAL);
        expect(customer.email).toBe('joao@email.com');
        expect(customer.phone).toBe('(11) 99999-9999');
        expect(customer.addresses).toEqual([]);
        expect(customer.id).toBeDefined();
        expect(customer.createdAt).toBeInstanceOf(Date);
        expect(customer.updatedAt).toBeInstanceOf(Date);
      });

      it('should accept valid CNPJ format', () => {
        const customer = Customer.create({
          ...validProps,
          document: '12.345.678/0001-95',
          type: CustomerType.COMPANY,
        });
        expect(customer.document).toBe('12.345.678/0001-95');
      });

      it('should trim name, email and phone', () => {
        const customer = Customer.create({
          ...validProps,
          name: '  João da Silva  ',
          phone: '  (11) 99999-9999  ',
        });
        expect(customer.name).toBe('João da Silva');
        expect(customer.phone).toBe('(11) 99999-9999');
      });
    });

    describe('name validation', () => {
      it('should throw if name is too short (< 3 chars)', () => {
        expect(() => Customer.create({ ...validProps, name: 'Jo' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if name is too long (> 150 chars)', () => {
        expect(() => Customer.create({ ...validProps, name: 'A'.repeat(151) }))
          .toThrow(DomainValidationException);
      });
      it('should throw if name is empty', () => {
        expect(() => Customer.create({ ...validProps, name: '' }))
          .toThrow(DomainValidationException);
      });
    });

    describe('document validation', () => {
      it('should throw if document is empty', () => {
        expect(() => Customer.create({ ...validProps, document: '' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if document has no formatting (raw digits)', () => {
        expect(() => Customer.create({ ...validProps, document: '12345678909' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if document does not match CPF or CNPJ pattern', () => {
        expect(() => Customer.create({ ...validProps, document: '123.456.789' }))
          .toThrow(DomainValidationException);
      });
    });

    describe('email validation', () => {
      it('should throw if email is empty', () => {
        expect(() => Customer.create({ ...validProps, email: '' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if email has no @ symbol', () => {
        expect(() => Customer.create({ ...validProps, email: 'notanemail' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if email has no domain', () => {
        expect(() => Customer.create({ ...validProps, email: 'user@' }))
          .toThrow(DomainValidationException);
      });
    });

    describe('phone validation', () => {
      it('should throw if phone is empty', () => {
        expect(() => Customer.create({ ...validProps, phone: '' }))
          .toThrow(DomainValidationException);
      });
      it('should throw if phone exceeds 20 chars', () => {
        expect(() => Customer.create({ ...validProps, phone: '1'.repeat(21) }))
          .toThrow(DomainValidationException);
      });
    });
  });
});
