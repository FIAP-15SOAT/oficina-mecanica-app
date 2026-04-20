import { Service } from '../../domain/entities';
import {
  IServiceRepository,
  PaginatedServicesDto,
} from '../../domain/interfaces/service.repository.interface';
import { PrismaService } from '../database/prisma';
import { Service as PrismaServiceModel } from '@prisma/client';

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
    activeOnly: boolean = true,
  ): Promise<PaginatedServicesDto> {
    const records = await this.prisma.service.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      where: {
        isActive: activeOnly,
      },
    });

    const count = await this.prisma.service.count({
      where: {
        isActive: activeOnly,
      },
    });

    return {
      services: records.map((record) => this.toDomain(record)),
      total: count,
    };
  }

  async update(id: string, data: Partial<Service>): Promise<Service> {
    const updatedService = await this.prisma.service.update({
      where: { id },
      data: {
        ...data,
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
