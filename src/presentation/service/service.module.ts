import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { FindAllServicesPaginatedUseCase } from '@application/use-cases/service/find-all-services-paginated.use-case';
import { DeleteServiceUseCase } from '@application/use-cases/service/delete-service.use-case';
import { FindServiceMetricsUseCase } from '@application/use-cases/service/find-service-metrics.use-case';
import { FindAllServicesMetricsUseCase } from '@application/use-cases/service/find-all-services-metrics.use-case';
import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ServiceController } from './service.controller';
import { ServicesMetricsController } from './services-metrics.controller';

@Module({
  controllers: [ServiceController, ServicesMetricsController],
  providers: [
    {
      provide: 'ICreateServiceUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new CreateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindServiceByIdUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new FindServiceByIdUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindAllServicesPaginatedUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new FindAllServicesPaginatedUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IUpdateServiceUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new UpdateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IDeleteServiceUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new DeleteServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindServiceMetricsUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new FindServiceMetricsUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindAllServicesMetricsUseCase',
      useFactory: (serviceRepository: IServiceRepository) =>
        new FindAllServicesMetricsUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
  ],
})
export class ServiceModule {}
