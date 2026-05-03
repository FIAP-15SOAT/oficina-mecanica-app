import { Injectable } from '@nestjs/common';
import { Prisma, PartSupply as PrismaPartSupply } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import {
  IPartSupplyRepository,
  PartSupplyFilters,
} from '@domain/interfaces/repositories/part-supply.repository.interface';
import { UpdateStockDto } from '@domain/interfaces/use-cases/part-supply/dto/update-stock.dto';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PartSupplyMapper } from '@infrastructure/mappers/part-supply.mapper';
import { PaginatedRepositoryResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaPartSupplyRepository implements IPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(partSupply: PartSupply): Promise<PartSupply> {
    try {
      const record = await this.prisma.partSupply.create({
        data: {
          id: partSupply.id,
          name: partSupply.name,
          description: partSupply.description,
          sku: partSupply.sku,
          partNumber: partSupply.partNumber,
          category: partSupply.category,
          unit: partSupply.unit,
          costPrice: partSupply.costPrice,
          salePrice: partSupply.salePrice,
          stock: partSupply.stock,
          minStock: partSupply.minStock,
          expiresAt: partSupply.expiresAt,
          isActive: partSupply.isActive,
        },
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

  async findByIds(ids: string[]): Promise<PartSupply[]> {
    const records = await this.prisma.partSupply.findMany({
      where: { id: { in: ids } },
    });

    return records.map((record) => PartSupplyMapper.toDomain(record));
  }

  async findBySku(sku: string): Promise<PartSupply | null> {
    const record = await this.prisma.partSupply.findUnique({ where: { sku } });
    return record ? PartSupplyMapper.toDomain(record) : null;
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: PartSupplyFilters,
  ): Promise<PaginatedRepositoryResult<PartSupply>> {
    const { name, sku, category, isActive, lowStock } = filters;

    const where: Prisma.PartSupplyWhereInput = {};

    if (name) where.name = { contains: name.trim(), mode: 'insensitive' };
    if (sku) where.sku = { contains: sku.trim(), mode: 'insensitive' };
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    if (lowStock) {
      where['stock'] = { lte: this.prisma.partSupply.fields.minStock };
    }

    const result = await paginate(
      this.prisma.partSupply,
      {
        where,
        orderBy: { name: 'asc' }
      },
      pagination,
    );

    return {
      items: result.items.map((r: PrismaPartSupply) => PartSupplyMapper.toDomain(r)),
      total: result.total,
    };
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

  async delete(id: string): Promise<void> {
    await this.prisma.partSupply.delete({ where: { id } });
  }

  async hasQuotePartSupplies(id: string): Promise<boolean> {
    const record = await this.prisma.quotePartSupply.findFirst({
      where: { partSupplyId: id },
      select: { partSupplyId: true },
    });

    return !!record;
  }

  async hasWorkOrderPartSupplies(id: string): Promise<boolean> {
    const record = await this.prisma.workOrderPartSupply.findFirst({
      where: { partSupplyId: id },
      select: { partSupplyId: true },
    });

    return !!record;
  }

  async incrementReservedStock(id: string, amount: number): Promise<void> {
    await this.prisma.partSupply.update({
      where: { id },
      data: { reservedStock: { increment: amount } },
    });
  }

  async decrementReservedStock(id: string, amount: number): Promise<void> {
    await this.prisma.partSupply.update({
      where: { id },
      data: { reservedStock: { decrement: amount } },
    });
  }

  async decrementStock(id: string, amount: number): Promise<void> {
    await this.prisma.partSupply.update({
      where: { id },
      data: { stock: { decrement: amount } },
    });
  }
}
