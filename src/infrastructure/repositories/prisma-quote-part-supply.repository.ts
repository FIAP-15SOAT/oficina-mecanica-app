import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { Prisma } from '@generated/client';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { IQuotePartSupplyRepository } from '@domain/interfaces/repositories/quote-part-supply.repository.interface';
import { QuotePartSupplyMapper } from '@infrastructure/mappers/quote-part-supply.mapper';

@Injectable()
export class PrismaQuotePartSupplyRepository implements IQuotePartSupplyRepository {
  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }
  private readonly prisma: PrismaService | Prisma.TransactionClient;

  async create(quotePartSupply: QuotePartSupply): Promise<QuotePartSupply> {
    const record = await this.prisma.quotePartSupply.create({
      data: {
        quoteId: quotePartSupply.quoteId,
        partSupplyId: quotePartSupply.partSupplyId,
        quantity: quotePartSupply.quantity,
        unitPrice: quotePartSupply.unitPrice,
        totalPrice: quotePartSupply.totalPrice,
      },
    });

    return QuotePartSupplyMapper.toDomain(record);
  }

  async update(quotePartSupply: QuotePartSupply): Promise<QuotePartSupply> {
    const record = await this.prisma.quotePartSupply.update({
      where: {
        quoteId_partSupplyId: {
          quoteId: quotePartSupply.quoteId,
          partSupplyId: quotePartSupply.partSupplyId,
        },
      },
      data: {
        quantity: quotePartSupply.quantity,
        unitPrice: quotePartSupply.unitPrice,
        totalPrice: quotePartSupply.totalPrice,
        updatedAt: quotePartSupply.updatedAt,
      },
    });

    return QuotePartSupplyMapper.toDomain(record);
  }

  async findOne(quoteId: string, partSupplyId: string): Promise<QuotePartSupply | null> {
    const record = await this.prisma.quotePartSupply.findUnique({
      where: { quoteId_partSupplyId: { quoteId, partSupplyId } },
    });

    return record ? QuotePartSupplyMapper.toDomain(record) : null;
  }

  async remove(quoteId: string, partSupplyId: string): Promise<void> {
    await this.prisma.quotePartSupply.delete({
      where: { quoteId_partSupplyId: { quoteId, partSupplyId } },
    });
  }

  async findByQuoteId(quoteId: string): Promise<QuotePartSupply[]> {
    const records = await this.prisma.quotePartSupply.findMany({ where: { quoteId } });
    return records.map((record) => QuotePartSupplyMapper.toDomain(record));
  }
}
