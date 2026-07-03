import { DeletePartSupplyUseCase } from '@application/use-cases/part-supply/delete-part-supply.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
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

  it('should delete a Part or Supply from Stock successfully', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', reservedStock: 0 });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.isPartSupplyInUse.mockResolvedValue(false);
    partSupplyRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('uuid-1')).resolves.toBeUndefined();
    expect(partSupplyRepository.delete).toHaveBeenCalledWith('uuid-1');
  });

  it('should throw BusinessRuleViolationException when item has reserved stock', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', reservedStock: 5 });
    partSupplyRepository.findById.mockResolvedValue(existing);

    await expect(useCase.execute('uuid-1')).rejects.toThrow(BusinessRuleViolationException);
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when item does not exist in Stock', async () => {
    partSupplyRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('uuid-999')).rejects.toThrow(ResourceNotFoundException);
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when item is in use', async () => {
    const existing = createMockPartSupply({ id: 'uuid-1', reservedStock: 0 });
    partSupplyRepository.findById.mockResolvedValue(existing);
    partSupplyRepository.isPartSupplyInUse.mockResolvedValue(true);

    await expect(useCase.execute('uuid-1')).rejects.toThrow(
      'Peça ou insumo não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos.',
    );
    expect(partSupplyRepository.delete).not.toHaveBeenCalled();
  });
});
