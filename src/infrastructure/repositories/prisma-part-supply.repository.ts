import { Injectable } from '@nestjs/common';
import { Prisma, PartSupply as PrismaPartSupply } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import {
  IPartSupplyRepository,
  PaginatedPartSuppliesDto,
  PartSupplyFilters,
} from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PartSupplyMapper } from '@infrastructure/mappers/part-supply.mapper';

@Injectable()
export class PrismaPartSupplyRepository implements IPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(partSupply: PartSupply): Promise<PartSupply> {
    try {
      const record = await this.prisma.partSupply.create({
        data: PartSupplyMapper.toPrismaCreate(partSupply),
      });
      return PartSupplyMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException('Peça ou insumo já cadastrado');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { id } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findBySku(sku: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { sku } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findAllPaginated(filters: PartSupplyFilters): Promise<PaginatedPartSuppliesDto> {
    const { page, limit, name, sku, category, isActive, lowStock } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (name) where['name'] = { contains: name, mode: 'insensitive' };
    if (sku) where['sku'] = { contains: sku, mode: 'insensitive' };
    if (category !== undefined) where['category'] = category;
    if (isActive !== undefined) where['isActive'] = isActive;

    if (lowStock) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM parts_supplies WHERE stock <= min_stock
      `;
      where['id'] = { in: rows.map((r: { id: string }) => r.id) };
    }

    const [records, total] = await this.prisma.$transaction([
      this.prisma.partSupply.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.partSupply.count({ where }),
    ]);

    return { items: records.map((r: PrismaPartSupply) => PartSupplyMapper.toDomain(r)), total };
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

  async updateStock(id: string, data: UpdateStockDto): Promise<PartSupply> {
    const { quantity, type, reason, workOrderId } = data;

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
