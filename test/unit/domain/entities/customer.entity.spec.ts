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
        expect(() => Customer.create({ ...validProps, name: 'Jo' }))
          .toThrow('Nome deve ter no mínimo 3 caracteres');
      });
      it('should throw if name is too long (> 150 chars)', () => {
        expect(() => Customer.create({ ...validProps, name: 'A'.repeat(151) }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, name: 'A'.repeat(151) }))
          .toThrow('Nome deve ter no máximo 150 caracteres');
      });
      it('should throw if name is empty', () => {
        expect(() => Customer.create({ ...validProps, name: '' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, name: '' }))
          .toThrow('Nome é obrigatório');
      });
    });

    describe('document validation', () => {
      it('should throw if document is empty', () => {
        expect(() => Customer.create({ ...validProps, document: '' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, document: '' }))
          .toThrow('Documento é obrigatório');
      });
      it('should throw if document has no formatting (raw digits)', () => {
        expect(() => Customer.create({ ...validProps, document: '12345678909' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, document: '12345678909' }))
          .toThrow('Documento inválido. Use o formato CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)');
      });
      it('should throw if document does not match CPF or CNPJ pattern', () => {
        expect(() => Customer.create({ ...validProps, document: '123.456.789' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, document: '123.456.789' }))
          .toThrow('Documento inválido. Use o formato CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)');
      });
      it('should throw if INDIVIDUAL uses CNPJ document', () => {
        expect(() => Customer.create({ ...validProps, type: CustomerType.INDIVIDUAL, document: '12.345.678/0001-95' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, type: CustomerType.INDIVIDUAL, document: '12.345.678/0001-95' }))
          .toThrow('Pessoa física deve informar um CPF válido');
      });
      it('should throw if COMPANY uses CPF document', () => {
        expect(() => Customer.create({ ...validProps, type: CustomerType.COMPANY, document: '123.456.789-09' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, type: CustomerType.COMPANY, document: '123.456.789-09' }))
          .toThrow('Pessoa jurídica deve informar um CNPJ válido');
      });
    });

    describe('email validation', () => {
      it('should throw if email is empty', () => {
        expect(() => Customer.create({ ...validProps, email: '' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, email: '' }))
          .toThrow('E-mail é obrigatório');
      });
      it('should throw if email has no @ symbol', () => {
        expect(() => Customer.create({ ...validProps, email: 'notanemail' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, email: 'notanemail' }))
          .toThrow('E-mail inválido');
      });
      it('should throw if email has no domain', () => {
        expect(() => Customer.create({ ...validProps, email: 'user@' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, email: 'user@' }))
          .toThrow('E-mail inválido');
      });
    });

    describe('phone validation', () => {
      it('should throw if phone is empty', () => {
        expect(() => Customer.create({ ...validProps, phone: '' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, phone: '' }))
          .toThrow('Telefone é obrigatório');
      });
      it('should throw if phone is too short (< 8 chars)', () => {
        expect(() => Customer.create({ ...validProps, phone: '1234567' }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, phone: '1234567' }))
          .toThrow('Telefone deve ter no mínimo 8 caracteres');
      });
      it('should throw if phone exceeds 20 chars', () => {
        expect(() => Customer.create({ ...validProps, phone: '1'.repeat(21) }))
          .toThrow(DomainValidationException);
        expect(() => Customer.create({ ...validProps, phone: '1'.repeat(21) }))
          .toThrow('Telefone deve ter no máximo 20 caracteres');
      });
    });
  });
});
