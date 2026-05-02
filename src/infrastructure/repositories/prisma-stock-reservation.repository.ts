import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import {
  IStockReservationRepository,
  StockReservationFilters,
} from '@domain/interfaces/repositories/stock-reservation.repository.interface';
import { StockReservationMapper } from '@infrastructure/mappers/stock-reservation.mapper';
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaStockReservationRepository implements IStockReservationRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(reservation: StockReservation): Promise<StockReservation> {
    const record = await this.prisma.stockReservation.create({
      data: {
        id: reservation.id,
        partSupplyId: reservation.partSupplyId,
        workOrderId: reservation.workOrderId,
        quantity: reservation.quantity,
      },
    });

    return StockReservationMapper.toDomain(record);
  }

  async createMany(reservations: StockReservation[]): Promise<void> {
    await this.prisma.stockReservation.createMany({
      data: reservations.map((r) => ({
        id: r.id,
        partSupplyId: r.partSupplyId,
        workOrderId: r.workOrderId,
        quantity: r.quantity,
      })),
    });
  }

  async findById(id: string): Promise<StockReservation | null> {
    const record = await this.prisma.stockReservation.findUnique({ where: { id } });
    return record ? StockReservationMapper.toDomain(record) : null;
  }

  async findByWorkOrderId(workOrderId: string): Promise<StockReservation[]> {
    const records = await this.prisma.stockReservation.findMany({ where: { workOrderId } });
    return records.map((r) => StockReservationMapper.toDomain(r));
  }

  async findByPartSupplyId(partSupplyId: string): Promise<StockReservation[]> {
    const records = await this.prisma.stockReservation.findMany({ where: { partSupplyId } });
    return records.map((r) => StockReservationMapper.toDomain(r));
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: StockReservationFilters,
  ): Promise<PaginatedRepositoryResult<StockReservation>> {
    const { partSupplyId, workOrderId } = filters;

    const where: Prisma.StockReservationWhereInput = {};

    if (partSupplyId) where.partSupplyId = partSupplyId;
    if (workOrderId) where.workOrderId = workOrderId;

    const result = await paginate(
      this.prisma.stockReservation,
      {
        where,
        orderBy: { createdAt: 'desc' }
      },
      pagination,
    );

    return {
      items: result.items.map((r) => StockReservationMapper.toDomain(r)),
      total: result.total,
    };
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.stockReservation.delete({ where: { id } });
  }

  async deleteByWorkOrderId(workOrderId: string): Promise<void> {
    await this.prisma.stockReservation.deleteMany({ where: { workOrderId } });
  }
}
