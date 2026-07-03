import {
  ServiceMetrics,
  IServiceRepository,
} from '@domain/interfaces/repositories/service.repository.interface';
import { IFindServiceMetricsUseCase } from '@application/ports/input/service/find-service-metrics.use-case.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class FindServiceMetricsUseCase implements IFindServiceMetricsUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(serviceId: string): Promise<ServiceMetrics> {
    const service = await this.serviceRepository.findById(serviceId);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', serviceId);
    }

    const { serviceName, executionCount, averageTimeMinutes } =
      await this.serviceRepository.findServiceMetrics(serviceId);

    return {
      serviceId,
      serviceName,
      executionCount,
      averageTimeMinutes,
    };
  }
}
