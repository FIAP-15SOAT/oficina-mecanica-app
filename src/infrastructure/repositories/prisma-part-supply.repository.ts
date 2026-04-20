import { Injectable } from '@nestjs/common';
import { PartSupply } from '@domain/entities/part-supply.entity';
import {
  IPartSupplyRepository,
  PartSupplyFilters,
} from '@domain/interfaces/repositories/part-supply.repository.interface';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PartSupplyMapper } from '@infrastructure/mappers/part-supply.mapper';

@Injectable()
export class PrismaPartSupplyRepository implements IPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(partSupply: PartSupply): Promise<PartSupply> {
    const record = await this.prisma.partSupply.create({
      data: PartSupplyMapper.toPrismaCreate(partSupply),
    });
    return PartSupplyMapper.toDomain(record);
  }

  async findById(id: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { id } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findBySku(sku: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { sku } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findAll(filters: PartSupplyFilters): Promise<{ items: PartSupply[]; total: number }> {
    const { page, limit, search, category, isActive } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category !== undefined) where['category'] = category;
    if (isActive !== undefined) where['isActive'] = isActive;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.partSupply.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.partSupply.count({ where }),
    ]);

    return { items: records.map((r) => PartSupplyMapper.toDomain(r)), total };
  }

  async findLowStock(): Promise<PartSupply[]> {
    const records = await this.prisma.partSupply.findMany({
      where: { isActive: true },
    });
    return records.filter((r) => r.stock <= r.minStock).map((r) => PartSupplyMapper.toDomain(r));
  }

  async update(id: string, data: Partial<PartSupply>): Promise<PartSupply> {
    const record = await this.prisma.partSupply.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.partNumber !== undefined && { partNumber: data.partNumber }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.salePrice !== undefined && { salePrice: data.salePrice }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return PartSupplyMapper.toDomain(record);
  }

  async updateStock(
    id: string,
    quantity: number,
    type: StockMovementType,
    reason?: string,
    workOrderId?: string,
  ): Promise<PartSupply> {
    const stockUpdate =
      type === StockMovementType.ENTRY
        ? { increment: quantity }
        : type === StockMovementType.EXIT
          ? { decrement: quantity }
          : { set: quantity };

    const [updatedRecord] = await this.prisma.$transaction([
      this.prisma.partSupply.update({
        where: { id },
        data: { stock: stockUpdate },
      }),
      this.prisma.stockMovement.create({
        data: { partSupplyId: id, workOrderId: workOrderId ?? null, type, quantity, reason },
      }),
    ]);

    return PartSupplyMapper.toDomain(updatedRecord);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.partSupply.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
