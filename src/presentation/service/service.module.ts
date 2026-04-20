import { Module } from '@nestjs/common';
import { CreateServiceUseCase } from '@application/use-cases/service/create-service.use-case';
import { UpdateServiceUseCase } from '@application/use-cases/service/update-service.use-case';
import { FindServiceByIdUseCase } from '@application/use-cases/service/find-service-by-id.use-case';
import { FindAllServicesPaginatedUseCase } from '@application/use-cases/service/find-all-services-paginated.use-case';
import { UpdateServiceStatusUseCase } from '@application/use-cases/service/update-service-status.use-case';
import { DeleteServiceUseCase } from '@application/use-cases/service/delete-service.use-case';
import { PrismaServiceRepository } from '@infrastructure/repositories/prisma-service.repository';
import { ServiceController } from './service.controller';

@Module({
  controllers: [ServiceController],
  providers: [
    {
      provide: 'IServiceRepository',
      useClass: PrismaServiceRepository,
    },
    {
      provide: 'CreateServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new CreateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'FindServiceByIdUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindServiceByIdUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'FindAllServicesPaginatedUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new FindAllServicesPaginatedUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'UpdateServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new UpdateServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'UpdateServiceStatusUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new UpdateServiceStatusUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
    {
      provide: 'DeleteServiceUseCase',
      useFactory: (serviceRepository: PrismaServiceRepository) =>
        new DeleteServiceUseCase(serviceRepository),
      inject: ['IServiceRepository'],
    },
  ],
})
export class ServiceModule {}
