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
import { SortCriterion } from '@domain/interfaces/common/sort-criterion';
import { SortDirection } from '@domain/enums/sort-direction.enum';
import { WORK_ORDER_STATUS_PRIORITY } from '@domain/constants/work-order-status-priority.constant';
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
        number: workOrder.number.toString(),
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
    sort?: SortCriterion[],
  ): Promise<PaginatedRepositoryResult<WorkOrder>> {
    const { number, customerId, vehicleId, assignedUserId, status, statusNotIn } = filters;

    // Type-safe where for count()
    const where: Prisma.WorkOrderWhereInput = {};
    if (number) where.number = { contains: number.trim(), mode: 'insensitive' };
    if (customerId) where.customerId = customerId;
    if (vehicleId) where.vehicleId = vehicleId;
    if (assignedUserId) where.assignedUserId = assignedUserId;
    if (status) where.status = status;
    else if (statusNotIn?.length) where.status = { notIn: statusNotIn };

    // SQL conditions for $queryRaw
    const conditions: Prisma.Sql[] = [];
    if (number) conditions.push(Prisma.sql`"number" ILIKE ${'%' + number.trim() + '%'}`);
    if (customerId) conditions.push(Prisma.sql`customer_id = ${customerId}::uuid`);
    if (vehicleId) conditions.push(Prisma.sql`vehicle_id = ${vehicleId}::uuid`);
    if (assignedUserId) conditions.push(Prisma.sql`assigned_user_id = ${assignedUserId}::uuid`);
    if (status) {
      conditions.push(Prisma.sql`status::text = ${status}`);
    } else if (statusNotIn?.length) {
      conditions.push(
        Prisma.sql`status::text NOT IN (${Prisma.join(statusNotIn.map((s) => Prisma.sql`${s}`), ', ')})`,
      );
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
        : Prisma.empty;

    // ORDER BY: status uses CASE priority, other fields use column name
    const COLUMN_MAP: Record<string, string> = { createdAt: 'created_at', updatedAt: 'updated_at' };

    const orderByClauses = (sort ?? []).map((criterion) => {
      if (criterion.field === 'status') {
        // desc = most urgent first (IN_PROGRESS) → CASE priority ASC
        // asc  = least urgent first (DELIVERED)  → CASE priority DESC
        const caseDir =
          criterion.direction === SortDirection.DESC ? Prisma.sql`ASC` : Prisma.sql`DESC`;
        return Prisma.sql`CASE status::text ${Prisma.join(
          Object.entries(WORK_ORDER_STATUS_PRIORITY).map(([s, p]) => Prisma.sql`WHEN ${s} THEN ${p}`),
          ' ',
        )} END ${caseDir}`;
      }
      const column = COLUMN_MAP[criterion.field] ?? criterion.field;
      const dir = criterion.direction === SortDirection.DESC ? Prisma.sql`DESC` : Prisma.sql`ASC`;
      return Prisma.sql`${Prisma.raw(column)} ${dir}`;
    });

    const orderByClause =
      orderByClauses.length > 0
        ? Prisma.sql`ORDER BY ${Prisma.join(orderByClauses, ', ')}`
        : Prisma.empty;

    const offset = (pagination.page - 1) * pagination.limit;

    const [total, orderedRows] = await Promise.all([
      this.prisma.workOrder.count({ where }),
      this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM work_orders
        ${whereClause}
        ${orderByClause}
        LIMIT ${pagination.limit} OFFSET ${offset}
      `),
    ]);

    if (orderedRows.length === 0) return { items: [], total };

    const orderedIds = orderedRows.map((r) => r.id);

    const records = await this.prisma.workOrder.findMany({
      where: { id: { in: orderedIds } },
      include: WORK_ORDER_LIST_INCLUDE,
    });

    // Restore order from $queryRaw (IN clause does not guarantee order)
    const idIndexMap = new Map(orderedIds.map((id, i) => [id, i]));
    records.sort((a, b) => (idIndexMap.get(a.id) ?? 0) - (idIndexMap.get(b.id) ?? 0));

    return {
      items: records.map((item) => WorkOrderMapper.toDomain(item)),
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

    return String(rows[0].next);
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
