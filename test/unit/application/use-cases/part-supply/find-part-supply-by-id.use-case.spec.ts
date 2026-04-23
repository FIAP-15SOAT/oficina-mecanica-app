import { FindPartSupplyByIdUseCase } from '@application/use-cases/part-supply/find-part-supply-by-id.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IPartSupplyRepository } from '@domain/interfaces/repositories/part-supply.repository.interface';
import {
  createMockPartSupply,
  createMockPartSupplyRepository,
} from '../../../../helpers/part-supply-mock.factory';

describe('FindPartSupplyByIdUseCase', () => {
  let useCase: FindPartSupplyByIdUseCase;
  let partSupplyRepository: jest.Mocked<IPartSupplyRepository>;

  beforeEach(() => {
    partSupplyRepository = createMockPartSupplyRepository();
    useCase = new FindPartSupplyByIdUseCase(partSupplyRepository);
  });

  it('should return the Part or Supply when found in Stock', async () => {
    const partSupply = createMockPartSupply({ id: 'uuid-1' });
    partSupplyRepository.findById.mockResolvedValue(partSupply);

    const result = await useCase.execute('uuid-1');

    expect(result).toEqual(partSupply);
    expect(partSupplyRepository.findById).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw ResourceNotFoundException when not found in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999')).rejects.toThrow(ResourceNotFoundException);
  });
});
