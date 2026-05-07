import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { PrismaService } from '../database/prisma/prisma.service';
import { Quote } from '@domain/entities/quote.entity';
import { QuoteService } from '@domain/entities/quote-service.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import {
  IQuoteRepository,
  QuoteFilters,
} from '@domain/interfaces/repositories/quote.repository.interface';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteMapper } from '@infrastructure/mappers/quote.mapper';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaQuoteRepository implements IQuoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(quote: Quote): Promise<Quote> {
    const record = await this.prisma.quote.create({
      data: {
        id: quote.id,
        workOrderId: quote.workOrderId,
        servicesAmount: quote.servicesAmount,
        partsAmount: quote.partsAmount,
        totalAmount: quote.totalAmount,
        status: quote.status,
        notes: quote.notes,
        sentAt: quote.sentAt,
        approvedAt: quote.approvedAt,
        rejectedAt: quote.rejectedAt,
      },
    });

    return QuoteMapper.toDomain(record);
  }

  async findById(id: string): Promise<Quote | null> {
    const record = await this.prisma.quote.findUnique({ where: { id } });
    return record ? QuoteMapper.toDomain(record) : null;
  }

  async findByIdWithDetails(id: string): Promise<Quote | null> {
    const record = await this.prisma.quote.findUnique({
      where: { id },
      include: { services: true, partsSupplies: true },
    });
    return record ? QuoteMapper.toDomain(record) : null;
  }

  async findByWorkOrderId(workOrderId: string): Promise<Quote[]> {
    const records = await this.prisma.quote.findMany({
      where: { workOrderId },
      include: { services: true, partsSupplies: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => QuoteMapper.toDomain(r));
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: QuoteFilters,
  ): Promise<PaginatedRepositoryResult<Quote>> {
    const { workOrderId, status } = filters;

    const where: Prisma.QuoteWhereInput = {};

    if (workOrderId) where.workOrderId = workOrderId;
    if (status) where.status = status;

    const result = await paginate(
      this.prisma.quote,
      {
        where,
        include: { services: true, partsSupplies: true },
        orderBy: { createdAt: 'desc' },
      },
      pagination,
    );

    return {
      items: result.items.map((r) => QuoteMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(quote: Quote): Promise<Quote> {
    try {
      const record = await this.prisma.quote.update({
        where: { id: quote.id, version: quote.version },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          status: quote.status,
          notes: quote.notes,
          sentAt: quote.sentAt,
          approvedAt: quote.approvedAt,
          rejectedAt: quote.rejectedAt,
          updatedAt: quote.updatedAt,
          version: { increment: 1 },
        },
        include: { services: true, partsSupplies: true },
      });

      return QuoteMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConcurrencyException(
          'Orçamento foi modificado por outra operação. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async rejectPendingByWorkOrderId(workOrderId: string): Promise<void> {
    const now = new Date();

    await this.prisma.quote.updateMany({
      where: {
        workOrderId,
        status: { in: [QuoteStatus.PENDING, QuoteStatus.SENT] },
      },
      data: { status: QuoteStatus.REJECTED, rejectedAt: now, updatedAt: now },
    });
  }

  async addServiceItem(quote: Quote, item: QuoteService): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quoteService.create({
        data: {
          quoteId: item.quoteId,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }

  async removeServiceItem(quote: Quote, serviceId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quoteService.delete({
        where: { quoteId_serviceId: { quoteId: quote.id, serviceId } },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }

  async updateServiceItemQuantity(quote: Quote, item: QuoteService): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quoteService.update({
        where: { quoteId_serviceId: { quoteId: item.quoteId, serviceId: item.serviceId } },
        data: {
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          updatedAt: item.updatedAt,
        },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }

  async addPartSupplyItem(quote: Quote, item: QuotePartSupply): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quotePartSupply.create({
        data: {
          quoteId: item.quoteId,
          partSupplyId: item.partSupplyId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }

  async removePartSupplyItem(quote: Quote, partSupplyId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quotePartSupply.delete({
        where: { quoteId_partSupplyId: { quoteId: quote.id, partSupplyId } },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }

  async updatePartSupplyItemQuantity(quote: Quote, item: QuotePartSupply): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.quotePartSupply.update({
        where: {
          quoteId_partSupplyId: { quoteId: item.quoteId, partSupplyId: item.partSupplyId },
        },
        data: {
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          updatedAt: item.updatedAt,
        },
      }),
      this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          servicesAmount: quote.servicesAmount,
          partsAmount: quote.partsAmount,
          totalAmount: quote.totalAmount,
          updatedAt: quote.updatedAt,
        },
      }),
    ]);
  }
}
