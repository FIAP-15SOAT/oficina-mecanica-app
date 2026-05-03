import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
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
    serviceRepository.hasWorkOrderServices.mockResolvedValue(false);
    serviceRepository.hasQuoteServices.mockResolvedValue(false);
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

  it('should throw ResourceConflictException when service has work order services', async () => {
    const service = createMockService();
    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.hasWorkOrderServices.mockResolvedValue(true);
    serviceRepository.hasQuoteServices.mockResolvedValue(false);

    await expect(useCase.execute(service.id)).rejects.toThrow(ResourceConflictException);
    expect(serviceRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when service has quote services', async () => {
    const service = createMockService();
    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.hasWorkOrderServices.mockResolvedValue(false);
    serviceRepository.hasQuoteServices.mockResolvedValue(true);

    await expect(useCase.execute(service.id)).rejects.toThrow(ResourceConflictException);
    expect(serviceRepository.delete).not.toHaveBeenCalled();
  });
});
