import { Service as PrismaService } from '@generated/client';
import { Service } from '@domain/entities/service.entity';

export class ServiceMapper {
  static toDomain(record: PrismaService): Service {
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
