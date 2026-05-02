import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { Prisma } from '@generated/client';
import { WorkOrder } from '@domain/entities/work-order.entity';
import {
  IWorkOrderRepository,
  WorkOrderFilters,
} from '@domain/interfaces/repositories/work-order.repository.interface';
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { WorkOrderMapper } from '@infrastructure/mappers/work-order.mapper';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaWorkOrderRepository implements IWorkOrderRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(workOrder: WorkOrder): Promise<WorkOrder> {
    const record = await this.prisma.workOrder.create({
      data: {
        id: workOrder.id,
        number: workOrder.number,
        customerId: workOrder.customerId,
        vehicleId: workOrder.vehicleId,
        assignedUserId: workOrder.assignedUserId,
        status: workOrder.status,
        problemDescription: workOrder.problemDescription,
        internalNotes: workOrder.internalNotes,
        mileageAtService: workOrder.mileageAtService,
        totalAmount: workOrder.totalAmount,
        approvedAt: workOrder.approvedAt,
        rejectedAt: workOrder.rejectedAt,
        startedAt: workOrder.startedAt,
        finishedAt: workOrder.finishedAt,
        deliveredAt: workOrder.deliveredAt,
      },
    });

    return WorkOrderMapper.toDomain(record);
  }

  async findById(id: string): Promise<WorkOrder | null> {
    const record = await this.prisma.workOrder.findUnique({ where: { id } });
    return record ? WorkOrderMapper.toDomain(record) : null;
  }

  async findAllPaginated(pagination: PaginationInput, filters: WorkOrderFilters): Promise<PaginatedRepositoryResult<WorkOrder>> {
    const { number, customerId, vehicleId, assignedUserId, status } = filters;

    const where: Prisma.WorkOrderWhereInput = {};

    if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (status) where.status = status;

    const result = await paginate(
      this.prisma.workOrder,
      {
        where,
        orderBy: { createdAt: 'desc' }
      },
      pagination,
    );

    return {
      items: result.items.map((r) => WorkOrderMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(workOrder: WorkOrder): Promise<WorkOrder> {
    const record = await this.prisma.workOrder.update({
      where: { id: workOrder.id },
      data: {
        ...(workOrder.assignedUserId !== undefined && { assignedUserId: workOrder.assignedUserId }),
        ...(workOrder.status !== undefined && { status: workOrder.status }),
        ...(workOrder.problemDescription !== undefined && {
          problemDescription: workOrder.problemDescription,
        }),
        ...(workOrder.internalNotes !== undefined && { internalNotes: workOrder.internalNotes }),
        ...(workOrder.mileageAtService !== undefined && {
          mileageAtService: workOrder.mileageAtService,
        }),
        ...(workOrder.totalAmount !== undefined && { totalAmount: workOrder.totalAmount }),
        ...(workOrder.approvedAt !== undefined && { approvedAt: workOrder.approvedAt }),
        ...(workOrder.rejectedAt !== undefined && { rejectedAt: workOrder.rejectedAt }),
        ...(workOrder.startedAt !== undefined && { startedAt: workOrder.startedAt }),
        ...(workOrder.finishedAt !== undefined && { finishedAt: workOrder.finishedAt }),
        ...(workOrder.deliveredAt !== undefined && { deliveredAt: workOrder.deliveredAt }),
        updatedAt: workOrder.updatedAt,
      },
    });
    return WorkOrderMapper.toDomain(record);
  }

  async generateNextNumber(): Promise<string> {
    const count = await this.prisma.workOrder.count();
    const padded = String(count + 1).padStart(6, '0');

    return padded;
  }
}
