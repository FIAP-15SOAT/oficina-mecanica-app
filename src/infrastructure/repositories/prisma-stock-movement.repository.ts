import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import {
  IStockMovementRepository,
  StockMovementFilters,
} from '@domain/interfaces/repositories/stock-movement.repository.interface';
import { StockMovementMapper } from '@infrastructure/mappers/stock-movement.mapper';
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

const STOCK_MOVEMENT_INCLUDE = {
  partSupply: true,
  workOrder: {
    include: {
      customer: true,
      vehicle: true,
      assignedUser: true,
    },
  },
} as const;

@Injectable()
export class PrismaStockMovementRepository implements IStockMovementRepository {
  private readonly prisma: PrismaService | Prisma.TransactionClient;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async create(movement: StockMovement): Promise<StockMovement> {
    const record = await this.prisma.stockMovement.create({
      data: {
        id: movement.id,
        partSupplyId: movement.partSupplyId,
        workOrderId: movement.workOrderId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
      },
    });

    return StockMovementMapper.toDomain(record);
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: StockMovementFilters,
  ): Promise<PaginatedRepositoryResult<StockMovement>> {
    const { partSupplyId, workOrderId, type, startDate, endDate } = filters;

    const where: Prisma.StockMovementWhereInput = {};

    if (partSupplyId) where.partSupplyId = partSupplyId;
    if (workOrderId) where.workOrderId = workOrderId;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const result = await paginate(
      this.prisma.stockMovement,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: STOCK_MOVEMENT_INCLUDE,
      },
      pagination,
    );

    return {
      items: result.items.map((r) => StockMovementMapper.toDomain(r as Parameters<typeof StockMovementMapper.toDomain>[0])),
      total: result.total,
    };
  }
}
