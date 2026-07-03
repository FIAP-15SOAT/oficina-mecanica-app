import { randomUUID } from 'node:crypto';

import { VehicleMapper } from '@infrastructure/persistence/prisma/mappers/vehicle.mapper';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('VehicleMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record with customer to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Preto',
        mileage: 50000,
        createdAt: now,
        updatedAt: now,
        customer: {
          id: randomUUID(),
          name: 'John Doe',
          document: '12345678909',
          type: CustomerType.INDIVIDUAL,
          email: 'john@example.com',
          phone: '11999999999',
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = VehicleMapper.toDomain(prismaRecord);

      expect(domainEntity.id).toBe(prismaRecord.id);
      expect(domainEntity.customerId).toBe(prismaRecord.customerId);
      expect(domainEntity.plate.value).toBe('ABC1234');
      expect(domainEntity.brand).toBe(prismaRecord.brand);
      expect(domainEntity.model).toBe(prismaRecord.model);
      expect(domainEntity.year).toBe(prismaRecord.year);
      expect(domainEntity.color).toBe(prismaRecord.color);
      expect(domainEntity.mileage).toBe(prismaRecord.mileage);
      expect(domainEntity.customer).toBeDefined();
      expect(domainEntity.customer!.name).toBe(prismaRecord.customer.name);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });

    it('should map a Prisma record with nulls and without customer to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        id: randomUUID(),
        customerId: randomUUID(),
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: null,
        mileage: null,
        createdAt: now,
        updatedAt: now,
        customer: null,
      };

      const domainEntity = VehicleMapper.toDomain(prismaRecord);

      expect(domainEntity.color).toBeNull();
      expect(domainEntity.mileage).toBeNull();
      expect(domainEntity.customer).toBeUndefined();
    });
  });
});
