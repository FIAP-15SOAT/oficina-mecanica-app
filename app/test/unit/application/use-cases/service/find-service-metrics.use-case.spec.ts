import { FindServiceMetricsUseCase } from '@application/use-cases/service/find-service-metrics.use-case';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import {
  createMockService,
  createMockServiceRepository,
} from '../../../../helpers/service-mock.factory';

describe('FindServiceMetricsUseCase', () => {
  let useCase: FindServiceMetricsUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new FindServiceMetricsUseCase(serviceRepository);
  });

  it('should return service metrics when service exists', async () => {
    const service = createMockService();
    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.findServiceMetrics.mockResolvedValue({
      serviceId: service.id,
      serviceName: service.name,
      executionCount: 10,
      averageTimeMinutes: 45,
    });

    const result = await useCase.execute(service.id);

    expect(result.serviceId).toBe(service.id);
    expect(result.serviceName).toBe(service.name);
    expect(result.executionCount).toBe(10);
    expect(result.averageTimeMinutes).toBe(45);
  });

  it('should throw ResourceNotFoundException when service does not exist', async () => {
    serviceRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent-id')).rejects.toThrow(ResourceNotFoundException);
    expect(serviceRepository.findServiceMetrics).not.toHaveBeenCalled();
  });

  it('should return null averageTimeMinutes when no data', async () => {
    const service = createMockService();
    serviceRepository.findById.mockResolvedValue(service);
    serviceRepository.findServiceMetrics.mockResolvedValue({
      serviceId: service.id,
      serviceName: service.name,
      executionCount: 0,
      averageTimeMinutes: null,
    });

    const result = await useCase.execute(service.id);

    expect(result.averageTimeMinutes).toBeNull();
  });
});
