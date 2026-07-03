import { Prisma } from '@generated/client';
import { randomUUID } from 'node:crypto';

import { WorkOrderPartSupplyMapper } from '@infrastructure/persistence/prisma/mappers/work-order-part-supply.mapper';

import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

describe('WorkOrderPartSupplyMapper', () => {
  describe('toDomain', () => {
    it('should map a Prisma record to a domain entity', () => {
      const now = new Date();
      const prismaRecord = {
        workOrderId: randomUUID(),
        partSupplyId: randomUUID(),
        quantity: 2,
        unitPrice: new Prisma.Decimal(50.0),
        totalPrice: new Prisma.Decimal(100.0),
        createdAt: now,
        updatedAt: now,
      };

      const domainEntity = WorkOrderPartSupplyMapper.toDomain(prismaRecord);

      expect(domainEntity.workOrderId).toBe(prismaRecord.workOrderId);
      expect(domainEntity.partSupplyId).toBe(prismaRecord.partSupplyId);
      expect(domainEntity.quantity).toBe(2);
      expect(domainEntity.unitPrice).toBe(50.0);
      expect(domainEntity.totalPrice).toBe(100.0);
      expect(domainEntity.createdAt).toBe(prismaRecord.createdAt);
      expect(domainEntity.updatedAt).toBe(prismaRecord.updatedAt);
    });

    it('should map partSupply relation when present', () => {
      const now = new Date();
      const partSupplyId = randomUUID();
      const prismaRecord = {
        workOrderId: randomUUID(),
        partSupplyId,
        quantity: 3,
        unitPrice: new Prisma.Decimal(20.0),
        totalPrice: new Prisma.Decimal(60.0),
        createdAt: now,
        updatedAt: now,
        partSupply: {
          id: partSupplyId,
          name: 'Óleo Motor',
          description: 'Óleo sintético 5W30',
          sku: 'OM-001',
          partNumber: 'MOB-5W30',
          category: PartSupplyCategory.SUPPLY,
          unit: Unit.L,
          costPrice: new Prisma.Decimal(18),
          salePrice: new Prisma.Decimal(35),
          stock: 50,
          minStock: 10,
          reservedStock: 3,
          version: 0,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        },
      };

      const domainEntity = WorkOrderPartSupplyMapper.toDomain(prismaRecord);

      expect(domainEntity.partSupply).toBeDefined();
      expect(domainEntity.partSupply!.id).toBe(partSupplyId);
      expect(domainEntity.partSupply!.name).toBe('Óleo Motor');
      expect(domainEntity.partSupply!.sku).toBe('OM-001');
    });
  });
});
