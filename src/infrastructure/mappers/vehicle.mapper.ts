import { Vehicle as PrismaVehicle, Customer as PrismaCustomer } from '@generated/client';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { CustomerMapper } from './customer.mapper';
import { Plate } from '@domain/value-objects/plate.vo';

type PrismaVehicleWithCustomer = PrismaVehicle & {
  customer?: PrismaCustomer | null;
};

export class VehicleMapper {
  static toDomain(prismaRecord: PrismaVehicleWithCustomer): Vehicle {
    return Vehicle.reconstitute({
      id: prismaRecord.id,
      customerId: prismaRecord.customerId,
      plate: Plate.create(prismaRecord.plate),
      brand: prismaRecord.brand,
      model: prismaRecord.model,
      year: prismaRecord.year,
      color: prismaRecord.color ?? null,
      mileage: prismaRecord.mileage ?? null,
      customer: prismaRecord.customer ? CustomerMapper.toDomain(prismaRecord.customer) : undefined,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }
}
