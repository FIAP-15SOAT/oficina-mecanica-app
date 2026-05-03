import { ServicesMetricsController } from '@presentation/service/services-metrics.controller';
import { IFindAllServicesMetricsUseCase } from '@domain/interfaces/use-cases/service/find-all-services-metrics.use-case.interface';
import { ServiceMetrics } from '@domain/interfaces/use-cases/service/find-service-metrics.use-case.interface';
import { randomUUID } from 'node:crypto';

describe('ServicesMetricsController', () => {
  let controller: ServicesMetricsController;
  let findAllServicesMetricsUseCase: jest.Mocked<IFindAllServicesMetricsUseCase>;

  beforeEach(() => {
    findAllServicesMetricsUseCase = { execute: jest.fn() };
    controller = new ServicesMetricsController(findAllServicesMetricsUseCase);
  });

  describe('getAllMetrics', () => {
    it('should return metrics for all services', async () => {
      const mockMetrics: ServiceMetrics[] = [
        {
          serviceId: randomUUID(),
          serviceName: 'Service 1',
          executionCount: 5,
          averageTimeMinutes: 20,
        },
      ];

      const paginatedResult = {
        items: mockMetrics,
        pagination: { totalRecords: 1, totalPages: 1, page: 1, limit: 10 },
      };

      findAllServicesMetricsUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.getAllMetrics({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: paginatedResult.items,
        pagination: paginatedResult.pagination,
      });
      expect(findAllServicesMetricsUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should use default values when page and limit are missing', async () => {
      findAllServicesMetricsUseCase.execute.mockResolvedValue({
        items: [],
        pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
      });

      await controller.getAllMetrics({});

      expect(findAllServicesMetricsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });
});
