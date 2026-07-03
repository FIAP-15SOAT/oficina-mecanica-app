import { FindAllServicesMetricsUseCase } from '@application/use-cases/service/find-all-services-metrics.use-case';
import { PaginationInput } from '@domain/interfaces/common/pagination.interface';
import {
  IServiceRepository,
  ServiceMetrics,
} from '@domain/interfaces/repositories/service.repository.interface';
import { createMockServiceRepository } from '../../../../helpers/service-mock.factory';

describe('FindAllServicesMetricsUseCase', () => {
  let useCase: FindAllServicesMetricsUseCase;
  let serviceRepository: jest.Mocked<IServiceRepository>;

  beforeEach(() => {
    serviceRepository = createMockServiceRepository();
    useCase = new FindAllServicesMetricsUseCase(serviceRepository);
  });

  it('should return paginated services metrics', async () => {
    const metrics: ServiceMetrics[] = [
      {
        serviceId: 'svc-1',
        serviceName: 'Troca de Óleo',
        executionCount: 5,
        averageTimeMinutes: 30,
      },
    ];
    const input: PaginationInput = { page: 1, limit: 10 };

    serviceRepository.findAllServicesMetrics.mockResolvedValue({ items: metrics, total: 1 });

    const result = await useCase.execute(input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].serviceName).toBe('Troca de Óleo');
    expect(result.pagination.totalRecords).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
    expect(serviceRepository.findAllServicesMetrics).toHaveBeenCalledWith(input);
  });

  it('should return empty when no metrics', async () => {
    serviceRepository.findAllServicesMetrics.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.execute({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });
});
