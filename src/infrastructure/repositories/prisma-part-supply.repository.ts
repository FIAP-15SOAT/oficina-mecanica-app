import { Injectable } from '@nestjs/common';
import { Prisma, PartSupply as PrismaPartSupply } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { PartSupply } from '@domain/entities/part-supply.entity';
import {
  IPartSupplyRepository,
  PartSupplyFilters,
} from '@domain/interfaces/repositories/part-supply.repository.interface';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { PartSupplyMapper } from '@infrastructure/mappers/part-supply.mapper';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';
import { existsBy } from '@infrastructure/database/prisma/prisma-exists.helper';

@Injectable()
export class PrismaPartSupplyRepository implements IPartSupplyRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const { name, sku, category, lowStock } = filters;

    const where: Prisma.PartSupplyWhereInput = {};

    if (name) where.name = { contains: name.trim(), mode: 'insensitive' };
    if (sku) where.sku = { contains: sku.trim(), mode: 'insensitive' };
    if (category) where.category = category;

    if (lowStock) {
      where['stock'] = { lte: this.prisma.partSupply.fields.minStock };
    }

    const result = await paginate(
      this.prisma.partSupply,
      {
        where,
        orderBy: { name: 'asc' },
      },
      pagination,
    );

    return {
      items: result.items.map((r: PrismaPartSupply) => PartSupplyMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(id: string, data: Partial<PartSupply>): Promise<PartSupply> {
    try {
      const record = await this.prisma.partSupply.update({
        where: { id, version: data.version },
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
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.reservedStock !== undefined && { reservedStock: data.reservedStock }),
          ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
          ...(data.updatedAt !== undefined && { updatedAt: data.updatedAt }),
          version: { increment: 1 },
        },
      });

      return PartSupplyMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConcurrencyException(
          'Peça/insumo foi modificado por outra operação. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.partSupply.delete({ where: { id } });
  }

  async isPartSupplyInUse(id: string): Promise<boolean> {
    const [hasWorkOrders, hasQuotes] = await Promise.all([
      existsBy(this.prisma.workOrderPartSupply, { partSupplyId: id }),
      existsBy(this.prisma.quotePartSupply, { partSupplyId: id }),
    ]);

    return hasWorkOrders || hasQuotes;
  }
}
