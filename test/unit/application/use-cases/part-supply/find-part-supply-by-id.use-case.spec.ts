import { FindPartSupplyByIdUseCase } from '@application/use-cases/part-supply/find-part-supply-by-id.use-case';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('FindPartSupplyByIdUseCase', () => {
  let useCase: FindPartSupplyByIdUseCase;
  const mockRepo = {
    create: jest.fn(), findById: jest.fn(), findBySku: jest.fn(),
    findAllPaginated: jest.fn(), update: jest.fn(),
    updateStock: jest.fn(), softDelete: jest.fn(),
  };

  const partSupply = new PartSupply({
    id: 'uuid-1', name: 'Filtro de Óleo', sku: 'FO-001', partNumber: 'MANN-W712',
    category: PartSupplyCategory.PART, unit: Unit.UN, costPrice: 25, salePrice: 45,
    stock: 10, minStock: 2, isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new FindPartSupplyByIdUseCase(mockRepo as any);
  });

  it('should return the Part or Supply when found in Stock', async () => {
    mockRepo.findById.mockResolvedValue(partSupply);
    const result = await useCase.execute('uuid-1');
    expect(result).toEqual(partSupply);
    expect(mockRepo.findById).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw ResourceNotFoundException when not found in Stock', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('uuid-999')).rejects.toThrow(ResourceNotFoundException);
  });
});
