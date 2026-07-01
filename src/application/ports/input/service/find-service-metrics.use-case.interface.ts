export interface ServiceMetrics {
  serviceId: string;
  serviceName: string;
  executionCount: number;
  averageTimeMinutes: number | null;
}

export interface IFindServiceMetricsUseCase {
  execute(serviceId: string): Promise<ServiceMetrics>;
}
