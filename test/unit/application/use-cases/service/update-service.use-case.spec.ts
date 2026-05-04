import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { UpdateServiceDto } from '@domain/interfaces/use-cases/service/dto/update-service.dto';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('UpdateServiceUseCase', () => {
  let useCase: UpdateServiceUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new UpdateServiceUseCase(serviceRepository);
  });

  it('should update a service successfully', async () => {
    const input: UpdateServiceDto = {
      name: 'Full Oil Change',
      basePrice: 149.99,
      estimatedTimeMin: 45,
    };

    const existing = createMockService();

    const updated = createMockService({
      ...existing,
      name: input.name,
      basePrice: input.basePrice,
      estimatedTimeMin: input.estimatedTimeMin,
    });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(null);
    serviceRepository.update.mockResolvedValue(updated);

    const result = await useCase.execute(existing.id, input);

    expect(result).toEqual(updated);
    expect(serviceRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should allow renaming a service to its own current name', async () => {
    const input: UpdateServiceDto = {
      name: 'Oil Change',
      basePrice: 99.99,
      estimatedTimeMin: 30,
    };

    const existing = createMockService({ name: input.name });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(existing);
    serviceRepository.update.mockResolvedValue(existing);

    const result = await useCase.execute(existing.id, input);

    expect(result).toEqual(existing);
    expect(serviceRepository.update).toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    const input: UpdateServiceDto = {
      name: 'Oil Change',
      basePrice: 99.99,
      estimatedTimeMin: 30,
    };

    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id', input)).rejects.toThrow(
      ResourceNotFoundException,
    );

    expect(serviceRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException when another service already uses the new name', async () => {
    const input: UpdateServiceDto = {
      name: 'Tire Rotation',
      basePrice: 49.99,
      estimatedTimeMin: 20,
    };

    const existing = createMockService();
    const conflicting = createMockService({ name: input.name });

    serviceRepository.findById.mockResolvedValue(existing);
    serviceRepository.findByName.mockResolvedValue(conflicting);

    await expect(useCase.execute(existing.id, input)).rejects.toThrow(ResourceConflictException);

    expect(serviceRepository.update).not.toHaveBeenCalled();
  });
});
