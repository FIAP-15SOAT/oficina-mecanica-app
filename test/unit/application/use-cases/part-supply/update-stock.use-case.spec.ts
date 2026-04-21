import { UpdateStockUseCase } from '@application/use-cases/part-supply/update-stock.use-case';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { Unit } from '@domain/enums/unit.enum';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  const mockRepo = {
    create: jest.fn(), findById: jest.fn(), findBySku: jest.fn(),
    findAllPaginated: jest.fn(), update: jest.fn(),
    updateStock: jest.fn(), softDelete: jest.fn(),
  };

  const partSupply = new PartSupply({
    id: 'uuid-1', name: 'Filtro de Óleo', sku: 'FO-001',
    category: PartSupplyCategory.PART, unit: Unit.UN, costPrice: 25, salePrice: 45,
    stock: 10, minStock: 2, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateStockUseCase(mockRepo as any);
  });

  it('should register a Stock entry (ENTRY)', async () => {
    mockRepo.findById.mockResolvedValue(partSupply);
    const after = new PartSupply({ ...partSupply, stock: 15, updatedAt: new Date() });
    mockRepo.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.ENTRY,
      quantity: 5,
      reason: 'Stock replenishment',
    });

    expect(mockRepo.updateStock).toHaveBeenCalledWith('uuid-1', {
      type: StockMovementType.ENTRY,
      quantity: 5,
      reason: 'Stock replenishment',
      workOrderId: undefined,
    });
    expect(result).toEqual(after);
  });

  it('should register a Stock exit linked to a Work Order (EXIT) with workOrderId', async () => {
    mockRepo.findById.mockResolvedValue(partSupply);
    const after = new PartSupply({ ...partSupply, stock: 7, updatedAt: new Date() });
    mockRepo.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.EXIT,
      quantity: 3,
      reason: 'Work Order consumption',
      workOrderId: 'os-uuid-1',
    });

    expect(mockRepo.updateStock).toHaveBeenCalledWith('uuid-1', {
      type: StockMovementType.EXIT,
      quantity: 3,
      reason: 'Work Order consumption',
      workOrderId: 'os-uuid-1',
    });
    expect(result).toEqual(after);
  });

  it('should throw ResourceConflictException when exit exceeds available Stock', async () => {
    mockRepo.findById.mockResolvedValue(partSupply); // stock = 10

    await expect(
      useCase.execute('uuid-1', {
        type: StockMovementType.EXIT,
        quantity: 15,
        workOrderId: 'os-uuid-1',
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(mockRepo.updateStock).not.toHaveBeenCalled();
  });

  it('should register a Stock adjustment (ADJUSTMENT) without a Work Order', async () => {
    mockRepo.findById.mockResolvedValue(partSupply);
    const after = new PartSupply({ ...partSupply, stock: 8, updatedAt: new Date() });
    mockRepo.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.ADJUSTMENT,
      quantity: 8,
      reason: 'Physical inventory adjustment',
    });

    expect(result).toEqual(after);
  });

  it('should throw ResourceNotFoundException when Part or Supply does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute('uuid-999', { type: StockMovementType.ENTRY, quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
