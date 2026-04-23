import { PartSupply as PrismaPartSupply } from '@generated/client';
import { PartSupply } from '@domain/entities/part-supply.entity';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';

export class PartSupplyMapper {
  static toDomain(prismaRecord: PrismaPartSupply): PartSupply {
    return new PartSupply({
      id: prismaRecord.id,
      name: prismaRecord.name,
      description: prismaRecord.description ?? undefined,
      sku: prismaRecord.sku,
      partNumber: prismaRecord.partNumber ?? undefined,
      category: prismaRecord.category as PartSupplyCategory,
      unit: prismaRecord.unit as Unit,
      costPrice: Number(prismaRecord.costPrice),
      salePrice: Number(prismaRecord.salePrice),
      stock: prismaRecord.stock,
      minStock: prismaRecord.minStock,
      expiresAt: prismaRecord.expiresAt ?? undefined,
      isActive: prismaRecord.isActive,
      createdAt: prismaRecord.createdAt,
      updatedAt: prismaRecord.updatedAt,
    });
  }

  static toPrismaCreate(partSupply: PartSupply) {
    return {
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
    };
  }
}
