import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Vehicle } from '@domain/entities/vehicle.entity';
import {
  IVehicleRepository,
  VehicleFilters,
} from '@domain/interfaces/repositories/vehicle.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { VehicleMapper } from '@infrastructure/mappers/vehicle.mapper';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';
import { existsBy } from '@infrastructure/database/prisma/prisma-exists.helper';

@Injectable()
export class PrismaVehicleRepository implements IVehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicle: Vehicle): Promise<Vehicle> {
    try {
      const record = await this.prisma.vehicle.create({
        data: {
          id: vehicle.id,
          customerId: vehicle.customerId,
          plate: vehicle.plate.value,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          mileage: vehicle.mileage,
        },
        include: { customer: true },
      });

      return VehicleMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Placa já cadastrada');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { customer: true },
    });

    return record ? VehicleMapper.toDomain(record) : null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { plate } });

    return record ? VehicleMapper.toDomain(record) : null;
  }

  async findAllByCustomerId(customerId: string): Promise<Vehicle[]> {
    const records = await this.prisma.vehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    return records.map((record) => VehicleMapper.toDomain(record));
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: VehicleFilters,
  ): Promise<PaginatedRepositoryResult<Vehicle>> {
    const { customerId, brand, plate } = filters;

    const where: Prisma.VehicleWhereInput = {};
    if (customerId) where.customerId = customerId;
    if (brand) where.brand = { contains: brand.trim(), mode: 'insensitive' };
    if (plate) where.plate = plate.trim();

    const result = await paginate(
      this.prisma.vehicle,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      },
      pagination,
    );

    return { items: result.items.map((r) => VehicleMapper.toDomain(r)), total: result.total };
  }

  async update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    try {
      const record = await this.prisma.vehicle.update({
        where: { id },
        data: {
          ...(data.customerId !== undefined && { customerId: data.customerId }),
          ...(data.plate !== undefined && { plate: data.plate.value }),
          ...(data.brand !== undefined && { brand: data.brand }),
          ...(data.model !== undefined && { model: data.model }),
          ...(data.year !== undefined && { year: data.year }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.mileage !== undefined && { mileage: data.mileage }),
        },
        include: { customer: true },
      });

      return VehicleMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Placa já cadastrada para outro veículo');
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.vehicle.delete({ where: { id } });
  }

  async isVehicleInUse(id: string): Promise<boolean> {
    return existsBy(this.prisma.workOrder, { vehicleId: id });
  }
}
