import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IVehicleRepository } from '@domain/interfaces/repositories/vehicle.repository.interface';
import { PrismaVehicleRepository } from '@infrastructure/repositories/prisma-vehicle.repository';
import { CreateVehicleUseCase } from '@application/use-cases/vehicle/create-vehicle.use-case';
import { FindAllVehiclesUseCase } from '@application/use-cases/vehicle/find-all-vehicles.use-case';
import { FindVehicleByIdUseCase } from '@application/use-cases/vehicle/find-vehicle-by-id.use-case';
import { UpdateVehicleUseCase } from '@application/use-cases/vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from '@application/use-cases/vehicle/delete-vehicle.use-case';
import { FindVehiclesByCustomerIdUseCase } from '@application/use-cases/vehicle/find-vehicles-by-customer-id.use-case';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [CustomersModule],
  controllers: [VehiclesController],
  providers: [
    {
      provide: 'IVehicleRepository',
      useClass: PrismaVehicleRepository,
    },
    {
      provide: 'ICreateVehicleUseCase',
      useFactory: (vehicleRepo: IVehicleRepository, customerRepo: ICustomerRepository) =>
        new CreateVehicleUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
    {
      provide: 'IFindAllVehiclesUseCase',
      useFactory: (repo: IVehicleRepository) => new FindAllVehiclesUseCase(repo),
      inject: ['IVehicleRepository'],
    },
    {
      provide: 'IFindVehicleByIdUseCase',
      useFactory: (repo: IVehicleRepository) => new FindVehicleByIdUseCase(repo),
      inject: ['IVehicleRepository'],
    },
    {
      provide: 'IUpdateVehicleUseCase',
      useFactory: (vehicleRepo: IVehicleRepository, customerRepo: ICustomerRepository) =>
        new UpdateVehicleUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
    {
      provide: 'IDeleteVehicleUseCase',
      useFactory: (repo: IVehicleRepository) => new DeleteVehicleUseCase(repo),
      inject: ['IVehicleRepository'],
    },
    {
      provide: 'IFindVehiclesByCustomerIdUseCase',
      useFactory: (vehicleRepo: IVehicleRepository, customerRepo: ICustomerRepository) =>
        new FindVehiclesByCustomerIdUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
  ],
})
export class VehiclesModule {}
