import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { Prisma } from '@generated/client';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ConcurrencyException } from '@infrastructure/exceptions/concurrency.exception';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import {
  IWorkOrderRepository,
  WorkOrderFilters,
} from '@domain/interfaces/repositories/work-order.repository.interface';
import {
  PaginatedRepositoryResult,
  PaginationInput,
} from '@domain/interfaces/common/pagination.interface';
import { WorkOrderMapper } from '@infrastructure/mappers/work-order.mapper';

const WORK_ORDER_LIST_INCLUDE = {
  customer: true,
  vehicle: true,
  assignedUser: true,
} as const;

const WORK_ORDER_DETAIL_INCLUDE = {
  customer: true,
  vehicle: true,
  assignedUser: true,
  services: { include: { service: true } },
  partSupplies: { include: { partSupply: true } },
} as const;

@Injectable()
export class PrismaWorkOrderRepository implements IWorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(workOrder: WorkOrder): Promise<WorkOrder> {
    const record = await this.prisma.workOrder.create({
      data: {
        id: workOrder.id,
        number: workOrder.number,
        customerId: workOrder.customerId,
        vehicleId: workOrder.vehicleId,
        assignedUserId: workOrder.assignedUserId,
        status: workOrder.status,
        problemDescription: workOrder.problemDescription,
        internalNotes: workOrder.internalNotes,
        mileageAtService: workOrder.mileageAtService,
        totalAmount: workOrder.totalAmount,
        approvedAt: workOrder.approvedAt,
        rejectedAt: workOrder.rejectedAt,
        startedAt: workOrder.startedAt,
        finishedAt: workOrder.finishedAt,
        deliveredAt: workOrder.deliveredAt,
      },
      include: WORK_ORDER_DETAIL_INCLUDE,
    });

    return WorkOrderMapper.toDomain(record);
  }

  async findById(id: string): Promise<WorkOrder | null> {
    const record = await this.prisma.workOrder.findUnique({
      where: { id },
      include: WORK_ORDER_LIST_INCLUDE,
    });

    return record ? WorkOrderMapper.toDomain(record) : null;
  }

  async findByIdWithDetails(id: string): Promise<WorkOrder | null> {
    const record = await this.prisma.workOrder.findUnique({
      where: { id },
      include: WORK_ORDER_DETAIL_INCLUDE,
    });
    return record ? WorkOrderMapper.toDomain(record) : null;
  }

  async findAllPaginated(
    pagination: PaginationInput,
    filters: WorkOrderFilters,
  ): Promise<PaginatedRepositoryResult<WorkOrder>> {
    const { number, customerId, vehicleId, assignedUserId, status } = filters;
    const { page, limit } = pagination;

    // Prisma where para count (type-safe, filtros idênticos)
    const where: Prisma.WorkOrderWhereInput = {};
    if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (status) where.status = status;

    // Condições SQL para a query de IDs ordenados
    const conditions: Prisma.Sql[] = [];
    // "number" is double-quoted because it is a reserved word in SQL
    if (number) conditions.push(Prisma.sql`"number" ILIKE ${'%' + number.trim() + '%'}`);
    if (customerId) conditions.push(Prisma.sql`customer_id = ${customerId}::uuid`);
    if (vehicleId) conditions.push(Prisma.sql`vehicle_id = ${vehicleId}::uuid`);
    if (assignedUserId) conditions.push(Prisma.sql`assigned_user_id = ${assignedUserId}::uuid`);
    if (status) conditions.push(Prisma.sql`status::text = ${status}`);

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    const offset = (page - 1) * limit;

    const query = Prisma.sql`
      SELECT id FROM work_orders
      ${whereClause}
      ORDER BY
        CASE status::text
          WHEN 'IN_PROGRESS'        THEN 1
          WHEN 'AWAITING_APPROVAL'  THEN 2
          WHEN 'IN_DIAGNOSIS'       THEN 3
          WHEN 'RECEIVED'           THEN 4
          ELSE 5
        END,
        created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [total, orderedRows] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.$queryRaw<{ id: string }[]>(query),
    ]);

    if (orderedRows.length === 0) {
      return { items: [], total };
    }

    const orderedIds = orderedRows.map((r) => r.id);

    const records = await this.prisma.workOrder.findMany({
      where: { id: { in: orderedIds } },
      include: WORK_ORDER_LIST_INCLUDE,
    });

    // Restaura a ordem do $queryRaw (IN clause não garante ordem)
    const idIndexMap = new Map(orderedIds.map((id, i) => [id, i]));
    records.sort((a, b) => (idIndexMap.get(a.id) ?? 0) - (idIndexMap.get(b.id) ?? 0));

    return {
      items: records.map((r) =>
        WorkOrderMapper.toDomain(r as Parameters<typeof WorkOrderMapper.toDomain>[0]),
      ),
      total,
    };
  }

  async update(workOrder: WorkOrder): Promise<WorkOrder> {
    try {
      const record = await this.prisma.workOrder.update({
        where: { id: workOrder.id, version: workOrder.version },
        data: {
          assignedUserId: workOrder.assignedUserId,
          status: workOrder.status,
          problemDescription: workOrder.problemDescription,
          internalNotes: workOrder.internalNotes,
          mileageAtService: workOrder.mileageAtService,
          totalAmount: workOrder.totalAmount,
          approvedAt: workOrder.approvedAt,
          rejectedAt: workOrder.rejectedAt,
          startedAt: workOrder.startedAt,
          finishedAt: workOrder.finishedAt,
          deliveredAt: workOrder.deliveredAt,
          updatedAt: workOrder.updatedAt,
          version: { increment: 1 },
        },
        include: WORK_ORDER_DETAIL_INCLUDE,
      });

      return WorkOrderMapper.toDomain(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConcurrencyException(
          'Ordem de serviço foi modificada por outra operação. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async generateNextNumber(): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ next: bigint }[]>`
      SELECT nextval('work_order_number_seq') AS next
    `;

    return String(rows[0].next).padStart(6, '0');
  }

  async addServiceItems(items: WorkOrderService[]): Promise<void> {
    try {
      await this.prisma.workOrderService.createMany({
        data: items.map((item) => ({
          workOrderId: item.workOrderId,
          serviceId: item.serviceId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status: item.status,
          startedAt: item.startedAt,
          finishedAt: item.finishedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException(
          'Itens duplicados detectados ao aplicar itens na ordem de serviço.',
        );
      }
      throw error;
    }
  }

  async updateServiceItemStatus(workOrder: WorkOrder, item: WorkOrderService): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.workOrderService.update({
          where: {
            workOrderId_serviceId: { workOrderId: item.workOrderId, serviceId: item.serviceId },
          },
          data: {
            status: item.status,
            startedAt: item.startedAt,
            finishedAt: item.finishedAt,
            updatedAt: item.updatedAt,
          },
        }),
        this.prisma.workOrder.update({
          where: { id: workOrder.id, version: workOrder.version },
          data: {
            status: workOrder.status,
            startedAt: workOrder.startedAt,
            finishedAt: workOrder.finishedAt,
            updatedAt: workOrder.updatedAt,
            version: { increment: 1 },
          },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ConcurrencyException(
          'Ordem de serviço foi modificada por outra operação. Tente novamente.',
        );
      }
      throw error;
    }
  }

  async addPartSupplyItems(items: WorkOrderPartSupply[]): Promise<void> {
    try {
      await this.prisma.workOrderPartSupply.createMany({
        data: items.map((item) => ({
          workOrderId: item.workOrderId,
          partSupplyId: item.partSupplyId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ResourceConflictException(
          'Itens duplicados detectados ao aplicar itens na ordem de serviço.',
        );
      }
      throw error;
    }
  }
}
