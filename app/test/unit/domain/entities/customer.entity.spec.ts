import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Customer Entity', () => {
  const validAddress = {
    street: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310100',
  };

  const validProps = {
    name: 'João da Silva',
    document: '123.456.789-09',
    type: CustomerType.INDIVIDUAL,
    email: 'joao@email.com',
    phone: '11999999999',
    address: validAddress,
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a valid customer with all required fields', () => {
        const customer = Customer.create(validProps);
        expect(customer.name).toBe('João da Silva');
        expect(customer.document.value).toBe('12345678909');
        expect(customer.type).toBe(CustomerType.INDIVIDUAL);
        expect(customer.email.value).toBe('joao@email.com');
        expect(customer.phone.value).toBe('11999999999');
        expect(customer.address).toBeDefined();
        expect(customer.address!.street).toBe(validAddress.street);
        expect(customer.id).toBeDefined();
        expect(customer.createdAt).toBeInstanceOf(Date);
        expect(customer.updatedAt).toBeInstanceOf(Date);
      });

      it('should accept valid CNPJ format and sanitize it', () => {
        const customer = Customer.create({
          ...validProps,
          document: '12.345.678/0001-95',
          type: CustomerType.COMPANY,
        });
        expect(customer.document.value).toBe('12345678000195');
      });

      it('should trim name, email and phone', () => {
        const customer = Customer.create({
          ...validProps,
          name: '  João da Silva  ',
          phone: '  11999999999  ',
        });
        expect(customer.name).toBe('João da Silva');
        expect(customer.phone.value).toBe('11999999999');
      });
    });

    describe('name validation', () => {
      it('should throw if name is too short (< 3 chars)', () => {
        expect(() => Customer.create({ ...validProps, name: 'Jo' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, name: 'Jo' })).toThrow(
          'Nome deve ter no mínimo 3 caracteres',
        );
      });
      it('should throw if name is too long (> 150 chars)', () => {
        expect(() => Customer.create({ ...validProps, name: 'A'.repeat(151) })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, name: 'A'.repeat(151) })).toThrow(
          'Nome deve ter no máximo 150 caracteres',
        );
      });
      it('should throw if name is empty', () => {
        expect(() => Customer.create({ ...validProps, name: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, name: '' })).toThrow('Nome é obrigatório');
      });
    });

    describe('document validation', () => {
      it('should throw if document is empty', () => {
        expect(() => Customer.create({ ...validProps, document: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, document: '' })).toThrow(
          'Documento é obrigatório',
        );
      });
      it('should throw if CPF fails digit verification (invalid check digits)', () => {
        expect(() => Customer.create({ ...validProps, document: '12345678900' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, document: '12345678900' })).toThrow(
          'Pessoa física deve informar um CPF válido',
        );
      });
      it('should throw if document does not match CPF or CNPJ pattern', () => {
        expect(() => Customer.create({ ...validProps, document: '123.456.789' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, document: '123.456.789' })).toThrow(
          'Pessoa física deve informar um CPF válido',
        );
      });
      it('should throw if INDIVIDUAL uses CNPJ document', () => {
        expect(() =>
          Customer.create({
            ...validProps,
            type: CustomerType.INDIVIDUAL,
            document: '12.345.678/0001-95',
          }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Customer.create({
            ...validProps,
            type: CustomerType.INDIVIDUAL,
            document: '12.345.678/0001-95',
          }),
        ).toThrow('Pessoa física deve informar um CPF válido');
      });
      it('should throw if COMPANY uses CPF document', () => {
        expect(() =>
          Customer.create({
            ...validProps,
            type: CustomerType.COMPANY,
            document: '123.456.789-09',
          }),
        ).toThrow(DomainValidationException);
        expect(() =>
          Customer.create({
            ...validProps,
            type: CustomerType.COMPANY,
            document: '123.456.789-09',
          }),
        ).toThrow('Pessoa jurídica deve informar um CNPJ válido');
      });
    });

    describe('email validation', () => {
      it('should throw if email is empty', () => {
        expect(() => Customer.create({ ...validProps, email: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, email: '' })).toThrow('E-mail é obrigatório');
      });
      it('should throw if email has no @ symbol', () => {
        expect(() => Customer.create({ ...validProps, email: 'notanemail' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, email: 'notanemail' })).toThrow(
          'E-mail inválido',
        );
      });
      it('should throw if email has no domain', () => {
        expect(() => Customer.create({ ...validProps, email: 'user@' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, email: 'user@' })).toThrow('E-mail inválido');
      });
    });

    describe('phone validation', () => {
      it('should throw if phone is empty', () => {
        expect(() => Customer.create({ ...validProps, phone: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, phone: '' })).toThrow(
          'Telefone é obrigatório',
        );
      });
      it('should throw if phone has invalid format', () => {
        expect(() => Customer.create({ ...validProps, phone: '1234567' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, phone: '1234567' })).toThrow(
          'Telefone inválido. Use o formato (11) 99999-9999 ou 99999-9999',
        );
      });
      it('should throw if phone does not match phone pattern', () => {
        expect(() => Customer.create({ ...validProps, phone: 'abc-defg-hijk' })).toThrow(
          DomainValidationException,
        );
        expect(() => Customer.create({ ...validProps, phone: 'abc-defg-hijk' })).toThrow(
          'Telefone inválido. Use o formato (11) 99999-9999 ou 99999-9999',
        );
      });
    });
  });
});
