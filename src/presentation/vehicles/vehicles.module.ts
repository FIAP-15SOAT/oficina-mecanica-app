import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { PrismaVehicleRepository } from '@infrastructure/repositories/prisma-vehicle.repository';
import { PrismaCustomerRepository } from '@infrastructure/repositories/prisma-customer.repository';
import { CreateVehicleUseCase } from '@application/use-cases/vehicle/create-vehicle.use-case';
import { FindAllVehiclesUseCase } from '@application/use-cases/vehicle/find-all-vehicles.use-case';
import { FindVehicleByIdUseCase } from '@application/use-cases/vehicle/find-vehicle-by-id.use-case';
import { UpdateVehicleUseCase } from '@application/use-cases/vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from '@application/use-cases/vehicle/delete-vehicle.use-case';
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
      useFactory: (vehicleRepo: PrismaVehicleRepository, customerRepo: PrismaCustomerRepository) =>
        new CreateVehicleUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
    {
      provide: 'IFindAllVehiclesUseCase',
      useFactory: (repo: PrismaVehicleRepository) => new FindAllVehiclesUseCase(repo),
      inject: ['IVehicleRepository'],
    },
    {
      provide: 'IFindVehicleByIdUseCase',
      useFactory: (repo: PrismaVehicleRepository) => new FindVehicleByIdUseCase(repo),
      inject: ['IVehicleRepository'],
    },
    {
      provide: 'IUpdateVehicleUseCase',
      useFactory: (vehicleRepo: PrismaVehicleRepository, customerRepo: PrismaCustomerRepository) =>
        new UpdateVehicleUseCase(vehicleRepo, customerRepo),
      inject: ['IVehicleRepository', 'ICustomerRepository'],
    },
    {
      provide: 'IDeleteVehicleUseCase',
      useFactory: (repo: PrismaVehicleRepository) => new DeleteVehicleUseCase(repo),
      inject: ['IVehicleRepository'],
    },
  ],
})
export class VehiclesModule {}
