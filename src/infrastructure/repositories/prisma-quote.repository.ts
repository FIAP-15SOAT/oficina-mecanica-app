import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { Quote } from '@domain/entities/quote.entity';
import {
  IQuoteRepository,
  QuoteFilters,
} from '@domain/interfaces/repositories/quote.repository.interface';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { QuoteMapper } from '@infrastructure/mappers/quote.mapper';
import { PaginatedRepositoryResult } from '@domain/interfaces/common/pagination.interface';
import { paginate } from '@infrastructure/database/prisma/prisma-paginate.helper';

@Injectable()
export class PrismaQuoteRepository implements IQuoteRepository {
  constructor(private readonly prisma: PrismaService) { }

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

  async findByWorkOrderId(workOrderId: string): Promise<Quote[]> {
    const records = await this.prisma.quote.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => QuoteMapper.toDomain(r));
  }

  async findApprovedByWorkOrderId(workOrderId: string): Promise<Quote | null> {
    const record = await this.prisma.quote.findFirst({
      where: { workOrderId, status: QuoteStatus.APPROVED },
    });

    return record ? QuoteMapper.toDomain(record) : null;
  }

  async findPendingByWorkOrderId(workOrderId: string): Promise<Quote[]> {
    const records = await this.prisma.quote.findMany({
      where: { workOrderId, status: { in: [QuoteStatus.PENDING, QuoteStatus.SENT] } },
    });

    return records.map((r) => QuoteMapper.toDomain(r));
  }

  async findAllPaginated(filters: QuoteFilters): Promise<PaginatedRepositoryResult<Quote>> {
    const { workOrderId, status } = filters;

    const where: Record<string, unknown> = {};

    if (workOrderId) where['workOrderId'] = workOrderId;
    if (status) where['status'] = status;

    const result = await paginate(
      this.prisma.quote,
      {
        where,
        orderBy: { createdAt: 'desc' }
      },
      filters,
    );

    return {
      items: result.items.map((r) => QuoteMapper.toDomain(r)),
      total: result.total,
    };
  }

  async update(quote: Quote): Promise<Quote> {
    const record = await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        ...(quote.servicesAmount !== undefined && { servicesAmount: quote.servicesAmount }),
        ...(quote.partsAmount !== undefined && { partsAmount: quote.partsAmount }),
        ...(quote.totalAmount !== undefined && { totalAmount: quote.totalAmount }),
        ...(quote.status !== undefined && { status: quote.status }),
        ...(quote.notes !== undefined && { notes: quote.notes }),
        ...(quote.sentAt !== undefined && { sentAt: quote.sentAt }),
        ...(quote.approvedAt !== undefined && { approvedAt: quote.approvedAt }),
        ...(quote.rejectedAt !== undefined && { rejectedAt: quote.rejectedAt }),
        updatedAt: quote.updatedAt,
      },
    });

    return QuoteMapper.toDomain(record);
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
}
