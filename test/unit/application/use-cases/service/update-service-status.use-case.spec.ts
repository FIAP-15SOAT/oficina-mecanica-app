import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UpdateServiceStatusUseCase } from '@application/use-cases/service/update-service-status.use-case';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { IServiceRepository } from '@domain/interfaces/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('UpdateServiceStatusUseCase', () => {
  let useCase: UpdateServiceStatusUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new UpdateServiceStatusUseCase(serviceRepository);
  });

  it('should deactivate an active service', async () => {
    const service = createMockService({ isActive: true });

    const deactivated = createMockService({
      ...service,
      isActive: false,
    });

    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.update.mockResolvedValue(deactivated);

    const result = await useCase.execute(service.id, false);

    expect(result).toEqual(deactivated);
    expect(serviceRepository.update).toHaveBeenCalledWith(service.id, service);
  });

  it('should activate an inactive service', async () => {
    const service = createMockService({ isActive: false });

    const activated = createMockService({
      ...service,
      isActive: true,
    });

    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.update.mockResolvedValue(activated);

    const result = await useCase.execute(service.id, true);

    expect(result).toEqual(activated);
    expect(serviceRepository.update).toHaveBeenCalledWith(service.id, service);
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id', true)).rejects.toThrow(
      ResourceNotFoundException,
    );

    expect(serviceRepository.update).not.toHaveBeenCalled();
  });
});
