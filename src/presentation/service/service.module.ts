import { Module } from '@nestjs/common';
import {
  CreateServiceUseCase,
  UpdateServiceUseCase,
  FindServiceByIdUseCase,
  FindAllServicesPaginatedUseCase,
  UpdateServiceStatusUseCase,
  DeleteServiceUseCase,
} from '../../application/use-cases/service';
import { PrismaServiceRepository } from '../../infrastructure/repositories';
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
      inject: ['IServiceRepository', 'IHashService'],
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
