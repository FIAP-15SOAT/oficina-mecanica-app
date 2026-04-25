import { Vehicle as PrismaVehicle, Customer as PrismaCustomer, Address as PrismaAddress } from '@generated/client';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { CustomerMapper } from './customer.mapper';

type PrismaCustomerWithAddress = PrismaCustomer & {
  address?: PrismaAddress | null;
};

type PrismaVehicleWithCustomer = PrismaVehicle & {
  customer?: PrismaCustomerWithAddress | null;
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

  static toPrismaCreate(vehicle: Vehicle) {
    return {
      id: vehicle.id,
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
    };
  }
}
