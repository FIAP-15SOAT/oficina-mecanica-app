import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { IWorkOrderServiceRepository } from '@domain/interfaces/repositories/work-order-service.repository.interface';
import { WorkOrderServiceMapper } from '@infrastructure/mappers/work-order-service.mapper';

@Injectable()
export class PrismaWorkOrderServiceRepository implements IWorkOrderServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(items: WorkOrderService[]): Promise<void> {
    await this.prisma.workOrderService.createMany({
      data: items.map((item) => ({
        workOrderId: item.workOrderId,
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        status: item.status,
        startedAt: item.startedAt,
        finishedAt: item.finishedAt,
      })),
    });
  }

  async findByWorkOrderAndService(
    workOrderId: string,
    serviceId: string,
  ): Promise<WorkOrderService | null> {
    const record = await this.prisma.workOrderService.findUnique({
      where: { workOrderId_serviceId: { workOrderId, serviceId } },
    });

    return record ? WorkOrderServiceMapper.toDomain(record) : null;
  }

  async update(workOrderService: WorkOrderService): Promise<WorkOrderService> {
    const record = await this.prisma.workOrderService.update({
      where: {
        workOrderId_serviceId: {
          workOrderId: workOrderService.workOrderId,
          serviceId: workOrderService.serviceId,
        },
      },
      data: {
        ...(workOrderService.status !== undefined && { status: workOrderService.status }),
        ...(workOrderService.startedAt !== undefined && { startedAt: workOrderService.startedAt }),
        ...(workOrderService.finishedAt !== undefined && {
          finishedAt: workOrderService.finishedAt,
        }),
        updatedAt: workOrderService.updatedAt,
      },
    });

    return WorkOrderServiceMapper.toDomain(record);
  }

  async isAllCompletedByWorkOrderId(workOrderId: string): Promise<boolean> {
    const nonCompleted = await this.prisma.workOrderService.findFirst({
      where: { workOrderId, status: { not: WorkOrderServiceStatus.COMPLETED } },
      select: { workOrderId: true },
    });

    return !nonCompleted;
  }
}
