import { UpdatePartSupplyUseCase } from '@application/use-cases/part-supply/update-part-supply.use-case';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PartSupplyNotFoundException } from '@domain/exceptions/part-supply-not-found.exception';
import { DuplicateSkuException } from '@domain/exceptions/duplicate-sku.exception';

describe('UpdatePartSupplyUseCase', () => {
  let useCase: UpdatePartSupplyUseCase;
  const mockRepo = {
    create: jest.fn(), findById: jest.fn(), findBySku: jest.fn(),
    findAll: jest.fn(), findLowStock: jest.fn(), update: jest.fn(),
    updateStock: jest.fn(), softDelete: jest.fn(),
  };

  const existing = new PartSupply({
    id: 'uuid-1', name: 'Filtro de Óleo', sku: 'FO-001', partNumber: 'MANN-W712',
    category: PartSupplyCategory.PART, unit: Unit.UN, costPrice: 25, salePrice: 45,
    stock: 10, minStock: 2, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdatePartSupplyUseCase(mockRepo as any);
  });

  it('should update a Part or Supply successfully', async () => {
    mockRepo.findById.mockResolvedValue(existing);
    const updated = new PartSupply({ ...existing, salePrice: 50, updatedAt: new Date() });
    mockRepo.update.mockResolvedValue(updated);

    const result = await useCase.execute('uuid-1', { salePrice: 50 });
    expect(result.salePrice).toBe(50);
    expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', { salePrice: 50 });
  });

  it('should throw PartSupplyNotFoundException when item does not exist in Stock', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('uuid-999', { name: 'New name' })).rejects.toThrow(
      PartSupplyNotFoundException,
    );
  });

  it('should throw DuplicateSkuException when updating SKU to one already in use', async () => {
    const other = new PartSupply({
      id: 'uuid-2', name: 'Other item', sku: 'FO-002',
      category: PartSupplyCategory.PART, unit: Unit.UN, costPrice: 10, salePrice: 20,
      stock: 5, minStock: 1, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.findBySku.mockResolvedValue(other);

    await expect(useCase.execute('uuid-1', { sku: 'FO-002' })).rejects.toThrow(DuplicateSkuException);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
