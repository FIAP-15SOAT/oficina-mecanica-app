import { randomUUID } from 'node:crypto';

import { CustomerMapper } from '@infrastructure/persistence/prisma/mappers/customer.mapper';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('CustomerMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma customer with address to a domain Customer', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        name: 'John Doe',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'john@example.com',
        phone: '11999999999',
        passwordHash: '$2b$12$hashedpassword',
        createdAt: now,
        updatedAt: now,
        address: {
          customerId: randomUUID(),
          street: 'Main St',
          city: 'Sao Paulo',
          state: 'SP',
          zipCode: '01000-000',
        },
      };

      const domainCustomer = CustomerMapper.toDomain(prismaRecord);

      expect(domainCustomer.id).toBe(prismaRecord.id);
      expect(domainCustomer.name).toBe(prismaRecord.name);
      expect(domainCustomer.document.value).toBe(prismaRecord.document);
      expect(domainCustomer.type).toBe(prismaRecord.type);
      expect(domainCustomer.email.value).toBe(prismaRecord.email);
      expect(domainCustomer.phone.value).toBe(prismaRecord.phone);
      expect(domainCustomer.address).toBeDefined();
      expect(domainCustomer.address!.street).toBe(prismaRecord.address.street);
    });

    it('should map a Prisma customer without address to a domain Customer', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        name: 'Jane Doe',
        document: '12345678909',
        type: CustomerType.INDIVIDUAL,
        email: 'jane@example.com',
        phone: '11999999999',
        passwordHash: '$2b$12$hashedpassword',
        createdAt: now,
        updatedAt: now,
        address: null,
      };

      const domainCustomer = CustomerMapper.toDomain(prismaRecord);

      expect(domainCustomer.address).toBeNull();
    });
  });
});
