import { randomUUID } from 'node:crypto';
import { Prisma } from '@generated/client';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PrismaPartSupplyRepository } from '@infrastructure/repositories/prisma-part-supply.repository';
import { createMockPrismaClient, MockPrismaService } from '../../../helpers/prisma-mock.factory';
import { createMockPartSupply } from '../../../helpers/part-supply-mock.factory';

describe('PrismaPartSupplyRepository', () => {
  let repository: PrismaPartSupplyRepository;
  let prisma: MockPrismaService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    repository = new PrismaPartSupplyRepository(prisma);
  });

  describe('create', () => {
    it('should create a part/supply and return domain entity', async () => {
      const partSupply = PartSupply.create({
        name: 'Filtro de Óleo',
        sku: 'FO-001',
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 25.0,
        salePrice: 45.0,
      });

      const prismaModel = createMockPartSupply({
        id: partSupply.id,
        name: partSupply.name,
        sku: partSupply.sku,
      });

      prisma.partSupply.create.mockResolvedValue(prismaModel);

      const result = await repository.create(partSupply);

      expect(result).toBeInstanceOf(PartSupply);
      expect(result.name).toBe(partSupply.name);
      expect(result.sku).toBe(partSupply.sku);
      expect(prisma.partSupply.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ResourceConflictException when SKU already exists', async () => {
      const partSupply = createMockPartSupply();
      const error = new Prisma.PrismaClientKnownRequestError('Duplicate SKU', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });
      prisma.partSupply.create.mockRejectedValue(error);

      await expect(repository.create(partSupply)).rejects.toThrow('Peça ou insumo já cadastrado');
    });

    it('should rethrow unknown errors', async () => {
      const partSupply = createMockPartSupply();
      const error = new Error('Database connection failed');
      prisma.partSupply.create.mockRejectedValue(error);

      await expect(repository.create(partSupply)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find a part/supply by id and return domain entity', async () => {
      const id = randomUUID();
      const prismaModel = createMockPartSupply({ id });

      prisma.partSupply.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findById(id);

      expect(result).toBeInstanceOf(PartSupply);
      expect(result!.id).toBe(id);
      expect(prisma.partSupply.findUnique).toHaveBeenCalledWith({ where: { id } });
    });

    it('should return null when part/supply is not found', async () => {
      prisma.partSupply.findUnique.mockResolvedValue(null);

      const result = await repository.findById(randomUUID());

      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should find multiple parts/supplies by ids and return domain entities', async () => {
      const ids = [randomUUID(), randomUUID()];
      const prismaModels = [
        createMockPartSupply({ id: ids[0] }),
        createMockPartSupply({ id: ids[1] }),
      ];

      prisma.partSupply.findMany.mockResolvedValue(prismaModels);

      const result = await repository.findByIds(ids);

      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PartSupply);
      expect(result[0].id).toBe(ids[0]);
      expect(result[1].id).toBe(ids[1]);
      expect(prisma.partSupply.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
      });
    });
  });

  describe('findBySku', () => {
    it('should find a part/supply by sku and return domain entity', async () => {
      const sku = 'FO-001';
      const prismaModel = createMockPartSupply({ sku });

      prisma.partSupply.findUnique.mockResolvedValue(prismaModel);

      const result = await repository.findBySku(sku);

      expect(result).toBeInstanceOf(PartSupply);
      expect(result!.sku).toBe(sku);
      expect(prisma.partSupply.findUnique).toHaveBeenCalledWith({ where: { sku } });
    });

    it('should return null when sku is not found', async () => {
      prisma.partSupply.findUnique.mockResolvedValue(null);

      const result = await repository.findBySku('UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('findAllPaginated', () => {
    it('should return all items without filters', async () => {
      const prismaModels = [
        createMockPartSupply({ id: randomUUID(), name: 'Filtro de Óleo' }),
        createMockPartSupply({ id: randomUUID(), name: 'Pastilha de Freio', sku: 'PF-001' }),
      ];

      prisma.partSupply.findMany.mockResolvedValue(prismaModels);
      prisma.partSupply.count.mockResolvedValue(2);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10, where: {} }),
      );
    });

    it('should apply name filter', async () => {
      prisma.partSupply.findMany.mockResolvedValue([]);
      prisma.partSupply.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { name: 'Filtro' });

      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'Filtro', mode: 'insensitive' } },
        }),
      );
    });

    it('should apply sku filter', async () => {
      prisma.partSupply.findMany.mockResolvedValue([]);
      prisma.partSupply.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { sku: 'FO' });

      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sku: { contains: 'FO', mode: 'insensitive' } },
        }),
      );
    });

    it('should apply category filter', async () => {
      prisma.partSupply.findMany.mockResolvedValue([]);
      prisma.partSupply.count.mockResolvedValue(0);

      await repository.findAllPaginated(
        { page: 1, limit: 10 },
        { category: PartSupplyCategory.PART },
      );

      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: PartSupplyCategory.PART } }),
      );
    });

    it('should apply lowStock filter using column reference', async () => {
      prisma.partSupply.findMany.mockResolvedValue([]);
      prisma.partSupply.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 1, limit: 10 }, { lowStock: true });

      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stock: { lte: 'minStockReference' } },
        }),
      );
    });

    it('should calculate skip correctly for page 2', async () => {
      prisma.partSupply.findMany.mockResolvedValue([]);
      prisma.partSupply.count.mockResolvedValue(0);

      await repository.findAllPaginated({ page: 2, limit: 5 }, {});

      expect(prisma.partSupply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should map prisma records to domain entities', async () => {
      const now = new Date();
      const prismaModel = createMockPartSupply({
        id: randomUUID(),
        expiresAt: new Date('2027-01-01'),
        createdAt: now,
        updatedAt: now,
      });

      prisma.partSupply.findMany.mockResolvedValue([prismaModel]);
      prisma.partSupply.count.mockResolvedValue(1);

      const result = await repository.findAllPaginated({ page: 1, limit: 10 }, {});

      expect(result.items[0]).toBeInstanceOf(PartSupply);
      expect(result.items[0].expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update a part/supply with all fields', async () => {
      const id = randomUUID();
      const data: Partial<PartSupply> = {
        name: 'Filtro Premium',
        description: 'Nova descrição',
        sku: 'FO-002',
        partNumber: 'MANN-W713',
        category: PartSupplyCategory.PART,
        unit: Unit.UN,
        costPrice: 30.0,
        salePrice: 59.9,
        minStock: 5,
        expiresAt: new Date('2028-01-01'),
      };

      const prismaModel = createMockPartSupply({ id, ...data });
      prisma.partSupply.update.mockResolvedValue(prismaModel);

      const result = await repository.update(id, data);

      expect(result).toBeInstanceOf(PartSupply);
      expect(result.name).toBe(data.name);
      expect(result.sku).toBe(data.sku);
      expect(prisma.partSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id } }),
      );
    });

    it('should only include defined fields in update data', async () => {
      const id = randomUUID();
      prisma.partSupply.update.mockResolvedValue(createMockPartSupply({ id }));

      await repository.update(id, { name: 'Novo Nome' });

      const callArg = prisma.partSupply.update.mock.calls[0][0];
      expect(callArg.data).toEqual({ name: 'Novo Nome' });
    });

    it('should update stock and reservedStock when provided', async () => {
      const id = randomUUID();
      const updatedAt = new Date('2026-05-06T10:00:00Z');
      prisma.partSupply.update.mockResolvedValue(
        createMockPartSupply({ id, stock: 7, reservedStock: 1 }),
      );

      await repository.update(id, { stock: 7, reservedStock: 1, updatedAt });

      const callArg = prisma.partSupply.update.mock.calls[0][0];
      expect(callArg.data).toEqual({ stock: 7, reservedStock: 1, updatedAt });
    });
  });

  describe('updateStock', () => {
    it('should register ENTRY stock movement and return updated entity', async () => {
      const id = randomUUID();
      const updatedModel = createMockPartSupply({ id, stock: 15 });

      prisma.partSupply.update.mockResolvedValue(updatedModel);

      const result = await repository.updateStock(id, {
        type: StockMovementType.ENTRY,
        quantity: 5,
        reason: 'Reposição',
      });

      expect(result).toBeInstanceOf(PartSupply);
      expect(result.stock).toBe(15);

      expect(prisma.partSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { stock: { increment: 5 } },
        }),
      );
    });

    it('should use increment for ENTRY', async () => {
      const id = randomUUID();
      prisma.partSupply.update.mockResolvedValue(createMockPartSupply({ id }));

      await repository.updateStock(id, { type: StockMovementType.ENTRY, quantity: 5 });

      expect(prisma.partSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { stock: { increment: 5 } },
        }),
      );
    });

    it('should use decrement for EXIT', async () => {
      const id = randomUUID();
      prisma.partSupply.update.mockResolvedValue(createMockPartSupply({ id }));

      await repository.updateStock(id, {
        type: StockMovementType.EXIT,
        quantity: 3,
        workOrderId: randomUUID(),
      });

      expect(prisma.partSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { stock: { decrement: 3 } },
        }),
      );
    });

    it('should use set for ADJUSTMENT and return final stock value', async () => {
      const id = randomUUID();
      prisma.partSupply.update.mockResolvedValue(createMockPartSupply({ id, stock: 2 }));

      const result = await repository.updateStock(id, {
        type: StockMovementType.ADJUSTMENT,
        quantity: 2,
        reason: 'Inventário',
      });

      expect(prisma.partSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { stock: { set: 2 } },
        }),
      );
      expect(result.stock).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete the part supply', async () => {
      const id = randomUUID();
      prisma.partSupply.delete.mockResolvedValue(createMockPartSupply({ id }));

      await repository.delete(id);

      expect(prisma.partSupply.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('isPartSupplyInUse', () => {
    it('should return true if associated with work orders', async () => {
      const id = randomUUID();
      prisma.workOrderPartSupply.count.mockResolvedValue(1);
      prisma.quotePartSupply.count.mockResolvedValue(0);
      const result = await repository.isPartSupplyInUse(id);
      expect(result).toBe(true);
    });

    it('should return true if associated with quotes', async () => {
      const id = randomUUID();
      prisma.workOrderPartSupply.count.mockResolvedValue(0);
      prisma.quotePartSupply.count.mockResolvedValue(1);
      const result = await repository.isPartSupplyInUse(id);
      expect(result).toBe(true);
    });

    it('should return false if not associated with work orders or quotes', async () => {
      prisma.workOrderPartSupply.count.mockResolvedValue(0);
      prisma.quotePartSupply.count.mockResolvedValue(0);
      const result = await repository.isPartSupplyInUse(randomUUID());
      expect(result).toBe(false);
    });
  });
});
