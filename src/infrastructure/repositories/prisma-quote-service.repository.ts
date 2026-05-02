import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { Prisma } from '@generated/client';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { IQuoteServiceRepository } from '@domain/interfaces/repositories/quote-service.repository.interface';
import { QuoteServiceMapper } from '@infrastructure/mappers/quote-service.mapper';

@Injectable()
export class PrismaQuoteServiceRepository implements IQuoteServiceRepository {
  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }
  private readonly prisma: PrismaService | Prisma.TransactionClient;

  async create(quoteService: QuoteService): Promise<QuoteService> {
    const record = await this.prisma.quoteService.create({
      data: {
        quoteId: quoteService.quoteId,
        serviceId: quoteService.serviceId,
        quantity: quoteService.quantity,
        unitPrice: quoteService.unitPrice,
        totalPrice: quoteService.totalPrice,
      },
    });

    return QuoteServiceMapper.toDomain(record);
  }

  async update(quoteService: QuoteService): Promise<QuoteService> {
    const record = await this.prisma.quoteService.update({
      where: {
        quoteId_serviceId: { quoteId: quoteService.quoteId, serviceId: quoteService.serviceId },
      },
      data: {
        quantity: quoteService.quantity,
        unitPrice: quoteService.unitPrice,
        totalPrice: quoteService.totalPrice,
        updatedAt: quoteService.updatedAt,
      },
    });

    return QuoteServiceMapper.toDomain(record);
  }

  async findOne(quoteId: string, serviceId: string): Promise<QuoteService | null> {
    const record = await this.prisma.quoteService.findUnique({
      where: { quoteId_serviceId: { quoteId, serviceId } },
    });

    return record ? QuoteServiceMapper.toDomain(record) : null;
  }

  async remove(quoteId: string, serviceId: string): Promise<void> {
    await this.prisma.quoteService.delete({
      where: { quoteId_serviceId: { quoteId, serviceId } },
    });
  }

  async findByQuoteId(quoteId: string): Promise<QuoteService[]> {
    const records = await this.prisma.quoteService.findMany({ where: { quoteId } });
    return records.map((record) => QuoteServiceMapper.toDomain(record));
  }
}
