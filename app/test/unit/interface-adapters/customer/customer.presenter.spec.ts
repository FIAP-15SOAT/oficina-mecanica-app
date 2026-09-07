import { randomUUID } from 'node:crypto';

import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Phone } from '@domain/value-objects/phone.vo';
import { Document } from '@domain/value-objects/document.vo';
import { Address } from '@domain/value-objects/address.vo';
import { CustomerType } from '@domain/enums/customer-type.enum';

import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';

describe('CustomerPresenter', () => {
  const customerId = randomUUID();
  const now = new Date();

  function makeCustomer(withAddress: boolean): Customer {
    const address = withAddress
      ? Address.create({
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        })
      : null;

    return Customer.reconstitute({
      id: customerId,
      name: 'João da Silva',
      document: Document.create('12345678909', CustomerType.INDIVIDUAL),
      type: CustomerType.INDIVIDUAL,
      email: Email.create('joao@email.com'),
      phone: Phone.create('11999999999'),
      address,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  describe('toResponse', () => {
    it('should map customer without address to a pure response', () => {
      const customer = makeCustomer(false);
      const result = CustomerPresenter.toResponse(customer);

      expect(result.id).toBe(customerId);
      expect(result.name).toBe('João da Silva');
      expect(result.document).toBe('12345678909');
      expect(result.type).toBe(CustomerType.INDIVIDUAL);
      expect(result.email).toBe('joao@email.com');
      expect(result.phone).toBe('11999999999');
      expect(result.address).toBeNull();
    });

    it('should map customer with address including address fields', () => {
      const customer = makeCustomer(true);
      const result = CustomerPresenter.toResponse(customer);

      expect(result.address).not.toBeNull();
      expect(result.address!.street).toBe('Rua das Flores, 123');
      expect(result.address!.city).toBe('São Paulo');
      expect(result.address!.state).toBe('SP');
      expect(result.address!.zipCode).toBe('01310100');
    });
  });

  describe('toDataResponse', () => {
    it('should wrap response in data key', () => {
      const customer = makeCustomer(false);
      const result = CustomerPresenter.toDataResponse(customer);

      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(customerId);
    });
  });

  describe('toPaginatedDataResponse', () => {
    it('should map paginated result to paginated response', () => {
      const customers = [makeCustomer(false), makeCustomer(true)];
      const result = CustomerPresenter.toPaginatedDataResponse({
        items: customers,
        pagination: { totalRecords: 2, totalPages: 1, page: 1, limit: 10 },
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalRecords).toBe(2);
    });
  });
});
