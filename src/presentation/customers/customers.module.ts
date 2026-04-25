import { Module } from '@nestjs/common';
import { PrismaCustomerRepository } from '@infrastructure/repositories/prisma-customer.repository';
import { PrismaVehicleRepository } from '@infrastructure/repositories/prisma-vehicle.repository';
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { FindVehiclesByCustomerIdUseCase } from '@application/use-cases/vehicle/find-vehicles-by-customer-id.use-case';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { CustomersController } from './customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    {
      provide: 'ICustomerRepository',
      useClass: PrismaCustomerRepository,
    },
    {
      provide: 'IVehicleRepository',
      useClass: PrismaVehicleRepository,
    },
    {
      provide: 'ICreateCustomerUseCase',
      useFactory: (repo: ICustomerRepository) => new CreateCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IFindAllCustomersUseCase',
      useFactory: (repo: ICustomerRepository) => new FindAllCustomersUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IFindCustomerByIdUseCase',
      useFactory: (repo: ICustomerRepository) => new FindCustomerByIdUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IUpdateCustomerUseCase',
      useFactory: (repo: ICustomerRepository) => new UpdateCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IDeleteCustomerUseCase',
      useFactory: (repo: ICustomerRepository) => new DeleteCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IFindVehiclesByCustomerIdUseCase',
      useFactory: (vehicleRepo: IVehicleRepository, customerRepo: ICustomerRepository) =>
        new FindVehiclesByCustomerIdUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
  ],
  exports: ['ICustomerRepository'],
})
export class CustomersModule {}
