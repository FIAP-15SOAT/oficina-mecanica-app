import { UpdateStockUseCase } from '@application/use-cases/part-supply/update-stock.use-case';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new UpdateStockUseCase(partSupplyRepository);
  });

  it('should register a Stock entry (ENTRY)', async () => {
    const partSupply = createMockPartSupply({ id: 'uuid-1', stock: 10 });
    const after = createMockPartSupply({ id: 'uuid-1', stock: 15 });
    partSupplyRepository.findById.mockResolvedValue(partSupply);
    partSupplyRepository.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.ENTRY,
      quantity: 5,
      reason: 'Stock replenishment',
    });

    expect(partSupplyRepository.updateStock).toHaveBeenCalledWith('uuid-1', {
      type: StockMovementType.ENTRY,
      quantity: 5,
      reason: 'Stock replenishment',
      workOrderId: undefined,
    });
    expect(result).toEqual(after);
  });

  it('should register a Stock exit linked to a Work Order (EXIT) with workOrderId', async () => {
    const partSupply = createMockPartSupply({ id: 'uuid-1', stock: 10 });
    const after = createMockPartSupply({ id: 'uuid-1', stock: 7 });
    partSupplyRepository.findById.mockResolvedValue(partSupply);
    partSupplyRepository.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.EXIT,
      quantity: 3,
      reason: 'Work Order consumption',
      workOrderId: 'uuid-1',
    });

    expect(partSupplyRepository.updateStock).toHaveBeenCalledWith('uuid-1', {
      type: StockMovementType.EXIT,
      quantity: 3,
      reason: 'Work Order consumption',
      workOrderId: 'uuid-1',
    });
    expect(result).toEqual(after);
  });

  it('should throw ResourceConflictException when exit exceeds available Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(createMockPartSupply({ id: 'uuid-1', stock: 10 }));

    await expect(
      useCase.execute('uuid-1', {
        type: StockMovementType.EXIT,
        quantity: 15,
        workOrderId: 'uuid-1',
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(partSupplyRepository.updateStock).not.toHaveBeenCalled();
  });

  it('should register a Stock adjustment (ADJUSTMENT) without a Work Order', async () => {
    const partSupply = createMockPartSupply({ id: 'uuid-1', stock: 10 });
    const after = createMockPartSupply({ id: 'uuid-1', stock: 8 });
    partSupplyRepository.findById.mockResolvedValue(partSupply);
    partSupplyRepository.updateStock.mockResolvedValue(after);

    const result = await useCase.execute('uuid-1', {
      type: StockMovementType.ADJUSTMENT,
      quantity: 8,
      reason: 'Physical inventory adjustment',
    });

    expect(result).toEqual(after);
  });

  it('should throw ResourceNotFoundException when Part or Supply does not exist', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('uuid-999', { type: StockMovementType.ENTRY, quantity: 1 }),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
