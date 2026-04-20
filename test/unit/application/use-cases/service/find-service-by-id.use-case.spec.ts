import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('FindServiceByIdUseCase', () => {
  let useCase: FindServiceByIdUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new FindServiceByIdUseCase(serviceRepository);
  });

  it('should return the service when it exists', async () => {
    const service = createMockService();

    serviceRepository.findById.mockResolvedValue(service);

    const result = await useCase.execute(service.id);

    expect(result).toBe(service);
    expect(serviceRepository.findById).toHaveBeenCalledWith(service.id);
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(ResourceNotFoundException);

    expect(serviceRepository.findById).toHaveBeenCalledWith('non-existent-id');
  });
});
