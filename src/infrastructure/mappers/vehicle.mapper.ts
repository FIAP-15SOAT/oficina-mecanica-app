import { Vehicle as PrismaVehicle, Customer as PrismaCustomer } from '@generated/client';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { CustomerMapper } from './customer.mapper';

type PrismaVehicleWithCustomer = PrismaVehicle & {
  customer?: PrismaCustomer | null;
};

export class VehicleMapper {
  static toDomain(prismaRecord: PrismaVehicleWithCustomer): Vehicle {
    return new Vehicle({
      id: prismaRecord.id,
      customerId: prismaRecord.customerId,
      plate: prismaRecord.plate,
      brand: prismaRecord.brand,
      model: prismaRecord.model,
      year: prismaRecord.year,
      color: prismaRecord.color ?? null,
      mileage: prismaRecord.mileage ?? null,
      customer: prismaRecord.customer
        ? CustomerMapper.toDomain(prismaRecord.customer)
        : undefined,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }


}
