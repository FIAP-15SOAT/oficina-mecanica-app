import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { FindAllServicesPaginatedUseCase } from '@application/use-cases/service/find-all-services-paginated.use-case';
import { UpdateServiceStatusUseCase } from '@application/use-cases/service/update-service-status.use-case';
import { DeleteServiceUseCase } from '@application/use-cases/service/delete-service.use-case';
import { FindServiceMetricsUseCase } from '@application/use-cases/service/find-service-metrics.use-case';
import { FindAllServicesMetricsUseCase } from '@application/use-cases/service/find-all-services-metrics.use-case';
import { PrismaServiceRepository } from '@infrastructure/repositories/prisma-service.repository';
import { ServiceController } from './service.controller';
import { ServicesMetricsController } from './services-metrics.controller';

@Module({
  controllers: [ServiceController, ServicesMetricsController],
  providers: [
    {
      provide: 'IServiceRepository',
      useClass: PrismaServiceRepository,
    },
    {
      provide: 'ICreateServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new CreateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindServiceByIdUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindServiceByIdUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindAllServicesPaginatedUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindAllServicesPaginatedUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IUpdateServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new UpdateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IUpdateServiceStatusUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new UpdateServiceStatusUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IDeleteServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new DeleteServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindServiceMetricsUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindServiceMetricsUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'IFindAllServicesMetricsUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindAllServicesMetricsUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
  ],
})
export class ServiceModule {}
