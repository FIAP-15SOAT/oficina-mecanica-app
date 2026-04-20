import { DeletePartSupplyUseCase } from '@application/use-cases/part-supply/delete-part-supply.use-case';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PartSupplyNotFoundException } from '@domain/exceptions/part-supply-not-found.exception';

describe('DeletePartSupplyUseCase', () => {
  let useCase: DeletePartSupplyUseCase;
  const mockRepo = {
    create: jest.fn(), findById: jest.fn(), findBySku: jest.fn(),
    findAll: jest.fn(), findLowStock: jest.fn(), update: jest.fn(),
    updateStock: jest.fn(), softDelete: jest.fn(),
  };

  const existing = new PartSupply({
    id: 'uuid-1', name: 'Filtro de Óleo', sku: 'FO-001',
    category: PartSupplyCategory.PART, unit: Unit.UN, costPrice: 25, salePrice: 45,
    stock: 10, minStock: 2, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeletePartSupplyUseCase(mockRepo as any);
  });

  it('should soft-delete a Part or Supply from Stock successfully', async () => {
    mockRepo.findById.mockResolvedValue(existing);
    mockRepo.softDelete.mockResolvedValue(undefined);

    await expect(useCase.execute('uuid-1')).resolves.toBeUndefined();
    expect(mockRepo.softDelete).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw PartSupplyNotFoundException when item does not exist in Stock', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('uuid-999')).rejects.toThrow(PartSupplyNotFoundException);
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });
});
