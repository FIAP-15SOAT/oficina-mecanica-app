import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { IWorkOrderPartSupplyRepository } from '@domain/interfaces/repositories/work-order-part-supply.repository.interface';

@Injectable()
export class PrismaWorkOrderPartSupplyRepository implements IWorkOrderPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

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
