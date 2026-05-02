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

  async findByPartId(partId: string): Promise<StockMovement[]> {
    const records = await this.prisma.stockMovement.findMany({
      where: { partSupplyId: partId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => StockMovementMapper.toDomain(r));
  }

  async findByWorkOrderId(workOrderId: string): Promise<StockMovement[]> {
    const records = await this.prisma.stockMovement.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => StockMovementMapper.toDomain(r));
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
        orderBy: { createdAt: 'desc' }
      },
      pagination,
    );

    return {
      items: result.items.map((r) => StockMovementMapper.toDomain(r)),
      total: result.total,
    };
  }
}
