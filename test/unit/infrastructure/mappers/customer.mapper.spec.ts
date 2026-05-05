import { CustomerMapper } from '@infrastructure/mappers/customer.mapper';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { randomUUID } from 'node:crypto';

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
        createdAt: now,
        updatedAt: now,
        address: {
          id: randomUUID(),
          customerId: randomUUID(),
          street: 'Main St',
          city: 'Sao Paulo',
          state: 'SP',
          zipCode: '01000-000',
          createdAt: now,
          updatedAt: now,
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
      expect(domainCustomer.address!.id).toBe(prismaRecord.address.id);
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
        createdAt: now,
        updatedAt: now,
        address: null,
      };

      const domainCustomer = CustomerMapper.toDomain(prismaRecord);

      expect(domainCustomer.address).toBeNull();
    });
  });
});
