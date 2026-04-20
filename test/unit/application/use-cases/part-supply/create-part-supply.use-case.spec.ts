import { CreatePartSupplyUseCase } from '@application/use-cases/part-supply/create-part-supply.use-case';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { DuplicateSkuException } from '@domain/exceptions/duplicate-sku.exception';

describe('CreatePartSupplyUseCase', () => {
  let useCase: CreatePartSupplyUseCase;
  const mockRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findBySku: jest.fn(),
    findAll: jest.fn(),
    findLowStock: jest.fn(),
    update: jest.fn(),
    updateStock: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreatePartSupplyUseCase(mockRepo as any);
  });

  const input = {
    name: 'Filtro de Óleo',
    sku: 'FO-001',
    partNumber: 'MANN-W712',
    category: PartSupplyCategory.PART,
    unit: Unit.UN,
    costPrice: 25.0,
    salePrice: 45.0,
  };

  it('should register a Part in Stock successfully', async () => {
    mockRepo.findBySku.mockResolvedValue(null);
    const saved = new PartSupply({
      id: 'uuid-1', ...input, stock: 0, minStock: 0,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    mockRepo.create.mockResolvedValue(saved);

    const result = await useCase.execute(input);

    expect(mockRepo.findBySku).toHaveBeenCalledWith('FO-001');
    expect(mockRepo.create).toHaveBeenCalled();
    expect(result.sku).toBe('FO-001');
    expect(result.category).toBe(PartSupplyCategory.PART);
  });

  it('should register a Supply in Stock successfully', async () => {
    const supplyInput = { ...input, sku: 'OL-001', category: PartSupplyCategory.SUPPLY };
    mockRepo.findBySku.mockResolvedValue(null);
    const saved = new PartSupply({
      id: 'uuid-2', ...supplyInput, stock: 0, minStock: 0,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    mockRepo.create.mockResolvedValue(saved);

    const result = await useCase.execute(supplyInput);

    expect(result.category).toBe(PartSupplyCategory.SUPPLY);
  });

  it('should throw DuplicateSkuException when SKU already exists in Stock', async () => {
    const existing = new PartSupply({
      id: 'uuid-x', ...input, stock: 5, minStock: 1,
      isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    mockRepo.findBySku.mockResolvedValue(existing);

    await expect(useCase.execute(input)).rejects.toThrow(DuplicateSkuException);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
