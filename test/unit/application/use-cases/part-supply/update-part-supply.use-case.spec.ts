import { UpdatePartSupplyUseCase } from '@application/use-cases/part-supply/update-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('UpdatePartSupplyUseCase', () => {
  let useCase: UpdatePartSupplyUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new UpdatePartSupplyUseCase(partSupplyRepository);
  });

  it('should update a Part or Supply successfully', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1' });
    const updated = createMockPartSupply({ id: 'uuid-1', salePrice: 50 });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute('uuid-1', { salePrice: 50 });

    expect(result).toEqual(updated);
    expect(partSupplyRepository.update).toHaveBeenCalledWith('uuid-1', { salePrice: 50 });
  });

  it('should throw ResourceNotFoundException when item does not exist in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999', { name: 'New name' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should throw ResourceConflictException when updating SKU to one already in use', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', sku: 'FO-001' });
    const other = createMockPartSupply({ id: 'uuid-2', sku: 'FO-002' });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.findBySku.mockResolvedValue(other);

    await expect(useCase.execute('uuid-1', { sku: 'FO-002' })).rejects.toThrow(ResourceConflictException);
    expect(partSupplyRepository.update).not.toHaveBeenCalled();
  });
});
