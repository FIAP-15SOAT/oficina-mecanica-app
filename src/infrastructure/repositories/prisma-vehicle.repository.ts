import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { Vehicle } from '@domain/entities/vehicle.entity';
import {
  IVehicleRepository,
  VehicleFilters,
} from '@domain/interfaces/repositories/vehicle.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { VehicleMapper } from '@infrastructure/mappers/vehicle.mapper';

const CUSTOMER_SELECT = { id: true, name: true, document: true };

@Injectable()
export class PrismaVehicleRepository implements IVehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(vehicle: Vehicle): Promise<Vehicle> {
    const record = await this.prisma.vehicle.create({
      data: VehicleMapper.toPrismaCreate(vehicle),
      include: { customer: { select: CUSTOMER_SELECT } },
    });
    return VehicleMapper.toDomain(record);
  }

  async findById(id: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { customer: { select: CUSTOMER_SELECT } },
    });
    return record ? VehicleMapper.toDomain(record) : null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    const record = await this.prisma.vehicle.findUnique({ where: { plate } });
    return record ? VehicleMapper.toDomain(record) : null;
  }

  async findAll(filters: VehicleFilters): Promise<{ items: Vehicle[]; total: number }> {
    const { page, limit, customerId, brand, plate } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {};
    if (customerId) where.customerId = customerId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (plate) where.plate = plate;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: CUSTOMER_SELECT } },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items: records.map((r) => VehicleMapper.toDomain(r)), total };
  }

  async update(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    const record = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.customerId !== undefined && { customerId: data.customerId }),
        ...(data.plate !== undefined && { plate: data.plate }),
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.mileage !== undefined && { mileage: data.mileage }),
      },
      include: { customer: { select: CUSTOMER_SELECT } },
    });
    return VehicleMapper.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.vehicle.delete({ where: { id } });
  }

  async hasWorkOrders(id: string): Promise<boolean> {
    const count = await this.prisma.workOrder.count({ where: { vehicleId: id } });
    return count > 0;
  }
}
