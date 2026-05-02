import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderServiceStatus } from '@domain/enums/work-order-service-status.enum';
import { IWorkOrderServiceRepository } from '@domain/interfaces/repositories/work-order-service.repository.interface';
import { WorkOrderServiceMapper } from '@infrastructure/mappers/work-order-service.mapper';

@Injectable()
export class PrismaWorkOrderServiceRepository implements IWorkOrderServiceRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(workOrderService: WorkOrderService): Promise<WorkOrderService> {
    const record = await this.prisma.workOrderService.create({
      data: {
        workOrderId: workOrderService.workOrderId,
        serviceId: workOrderService.serviceId,
        quantity: workOrderService.quantity,
        unitPrice: workOrderService.unitPrice,
        totalPrice: workOrderService.totalPrice,
        status: workOrderService.status,
        startedAt: workOrderService.startedAt,
        finishedAt: workOrderService.finishedAt,
      },
    });

    return WorkOrderServiceMapper.toDomain(record);
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

  async findByWorkOrderId(workOrderId: string): Promise<WorkOrderService[]> {
    const records = await this.prisma.workOrderService.findMany({ where: { workOrderId } });

    return records.map((r) => WorkOrderServiceMapper.toDomain(r));
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

  async delete(workOrderId: string, serviceId: string): Promise<void> {
    await this.prisma.workOrderService.delete({
      where: { workOrderId_serviceId: { workOrderId, serviceId } },
    });
  }

  async isAllCompletedByWorkOrderId(workOrderId: string): Promise<boolean> {
    const nonCompleted = await this.prisma.workOrderService.findFirst({
      where: { workOrderId, status: { not: WorkOrderServiceStatus.COMPLETED } },
      select: { workOrderId: true },
    });

    return !nonCompleted;
  }
}
