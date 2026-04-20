import { Injectable } from '@nestjs/common';
import { Service } from '@domain/entities/service.entity';
import {
  IServiceRepository,
  PaginatedServicesDto,
} from '@domain/interfaces/repositories/service.repository.interface';
import { PrismaService } from '../database/prisma/prisma.service';
import { Service as PrismaServiceModel } from '@generated/client';

@Injectable()
export class PrismaServiceRepository implements IServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(service: Service): Promise<Service> {
    const createdService = await this.prisma.service.create({
      data: {
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        estimatedTimeMin: service.estimatedTimeMin,
        isActive: service.isActive,
      },
    });

    return this.toDomain(createdService);
  }

  async findById(id: string): Promise<Service | null> {
    const serviceRecord = await this.prisma.service.findUnique({ where: { id } });

    return serviceRecord ? this.toDomain(serviceRecord) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const serviceRecord = await this.prisma.service.findFirst({ where: { name } });

    return serviceRecord ? this.toDomain(serviceRecord) : null;
  }

  async findAllPaginated(
    page: number,
    pageSize: number,
    active?: boolean,
  ): Promise<PaginatedServicesDto> {
    const where = active !== undefined ? { isActive: active } : {};

    const [records, count] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        where,
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      services: records.map((record: PrismaServiceModel) => this.toDomain(record)),
      total: count,
    };
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    const updatedService = await this.prisma.service.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.estimatedTimeMin !== undefined && { estimatedTimeMin: data.estimatedTimeMin }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.toDomain(updatedService);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.service.delete({ where: { id } });
  }

  private toDomain(record: PrismaServiceModel): Service {
    return new Service({
      id: record.id,
      name: record.name,
      description: record.description,
      basePrice: Number(record.basePrice),
      estimatedTimeMin: record.estimatedTimeMin,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
