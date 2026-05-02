import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { IWorkOrderPartSupplyRepository } from '@domain/interfaces/repositories/work-order-part.repository.interface';
import { WorkOrderPartSupplyMapper } from '@infrastructure/mappers/work-order-part-supply.mapper';

@Injectable()
export class PrismaWorkOrderPartSupplyRepository implements IWorkOrderPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(entity: WorkOrderPartSupply): Promise<WorkOrderPartSupply> {
    const record = await this.prisma.workOrderPartSupply.create({
      data: {
        workOrderId: entity.workOrderId,
        partSupplyId: entity.partSupplyId,
        quantity: entity.quantity,
        unitPrice: entity.unitPrice,
        totalPrice: entity.totalPrice,
      },
    });

    return WorkOrderPartSupplyMapper.toDomain(record);
  }


  async createMany(items: WorkOrderPartSupply[]): Promise<void> {
    await this.prisma.workOrderPartSupply.createMany({
      data: items.map((item) => ({
        workOrderId: item.workOrderId,
        partSupplyId: item.partSupplyId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
    });
  }
}
