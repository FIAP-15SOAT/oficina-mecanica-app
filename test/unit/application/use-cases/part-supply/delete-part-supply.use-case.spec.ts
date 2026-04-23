import { DeletePartSupplyUseCase } from '@application/use-cases/part-supply/delete-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('DeletePartSupplyUseCase', () => {
  let useCase: DeletePartSupplyUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new DeletePartSupplyUseCase(partSupplyRepository);
  });

  it('should soft-delete a Part or Supply from Stock successfully', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1' });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.softDelete.mockResolvedValue(undefined);

    await expect(useCase.execute('uuid-1')).resolves.toBeUndefined();
    expect(partSupplyRepository.softDelete).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw ResourceNotFoundException when item does not exist in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999')).rejects.toThrow(ResourceNotFoundException);
    expect(partSupplyRepository.softDelete).not.toHaveBeenCalled();
  });
});
