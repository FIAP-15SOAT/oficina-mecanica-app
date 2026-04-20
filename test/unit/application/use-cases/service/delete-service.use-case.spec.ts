import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DeleteServiceUseCase } from '@application/use-cases/service/delete-service.use-case';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('DeleteServiceUseCase', () => {
  let useCase: DeleteServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new DeleteServiceUseCase(serviceRepository);
  });

  it('should delete a service successfully', async () => {
    const service = createMockService();

    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.delete.mockResolvedValue(undefined);

    await useCase.execute(service.id);

    expect(serviceRepository.delete).toHaveBeenCalledWith(service.id);
    expect(serviceRepository.delete).toHaveBeenCalledTimes(1);
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(ResourceNotFoundException);

    expect(serviceRepository.delete).not.toHaveBeenCalled();
  });
});
