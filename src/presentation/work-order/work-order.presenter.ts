import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { Customer } from '@domain/entities/customer.entity';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { User } from '@domain/entities/user.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  WorkOrderAssignedUserResponseDto,
  WorkOrderCustomerResponseDto,
  WorkOrderDataResponseDto,
  WorkOrderPaginatedResponseDto,
  WorkOrderPartSupplyItemResponseDto,
  WorkOrderResponseDto,
  WorkOrderServiceItemResponseDto,
  WorkOrderServiceItemDataResponseDto,
  WorkOrderVehicleResponseDto,
} from './dto/work-order-response.dto';
import {
  StatusHistoryChangedByDto,
  StatusHistoryListResponseDto,
  StatusHistoryResponseDto,
} from './dto/status-history-response.dto';

export class WorkOrderPresenter {
  static toSummaryResponse(workOrder: WorkOrder): WorkOrderResponseDto {
    return {
      id: workOrder.id,
      number: workOrder.number,
      customer: WorkOrderPresenter.toCustomer(workOrder.customer!),
      vehicle: WorkOrderPresenter.toVehicle(workOrder.vehicle!),
      assignedUser: workOrder.assignedUser
        ? WorkOrderPresenter.toUser(workOrder.assignedUser)
        : null,
      status: workOrder.status,
      problemDescription: workOrder.problemDescription,
      internalNotes: workOrder.internalNotes,
      mileageAtService: workOrder.mileageAtService,
      totalAmount: workOrder.totalAmount,
      approvedAt: workOrder.approvedAt,
      startedAt: workOrder.startedAt,
      finishedAt: workOrder.finishedAt,
      deliveredAt: workOrder.deliveredAt,
      createdAt: workOrder.createdAt,
      updatedAt: workOrder.updatedAt,
    };
  }

  static toResponse(workOrder: WorkOrder): WorkOrderResponseDto {
    return {
      ...WorkOrderPresenter.toSummaryResponse(workOrder),
      services: workOrder.services.map((s) => WorkOrderPresenter.toServiceItem(s)),
      partSupplies: workOrder.partSupplies.map((p) => WorkOrderPresenter.toPartSupplyItem(p)),
    };
  }

  static toDataResponse(workOrder: WorkOrder): WorkOrderDataResponseDto {
    return { data: WorkOrderPresenter.toResponse(workOrder) };
  }

  static toPaginatedResponse(
    paginatedResult: PaginatedResult<WorkOrder>,
  ): WorkOrderPaginatedResponseDto {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map((wo) => WorkOrderPresenter.toSummaryResponse(wo)),
      pagination,
    };
  }

  static toStatusHistoryListResponse(history: StatusHistory[]): StatusHistoryListResponseDto {
    return {
      data: history.map(
        (entry): StatusHistoryResponseDto => ({
          id: entry.id,
          changedBy: entry.changedBy ? WorkOrderPresenter.toChangedBy(entry.changedBy) : null,
          previousStatus: entry.previousStatus,
          newStatus: entry.newStatus,
          notes: entry.notes,
          createdAt: entry.createdAt,
        }),
      ),
    };
  }

  static toServiceItemDataResponse(item: WorkOrderService): WorkOrderServiceItemDataResponseDto {
    return { data: WorkOrderPresenter.toServiceItem(item) };
  }

  private static toCustomer(customer: Customer): WorkOrderCustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      type: customer.type,
      document: customer.document.value,
      email: customer.email.value,
      phone: customer.phone.value,
    };
  }

  private static toVehicle(vehicle: Vehicle): WorkOrderVehicleResponseDto {
    return {
      id: vehicle.id,
      plate: vehicle.plate.value,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
    };
  }

  private static toUser(user: User): WorkOrderAssignedUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
    };
  }

  private static toChangedBy(user: User): StatusHistoryChangedByDto {
    return WorkOrderPresenter.toUser(user);
  }

  static toServiceItem(this: void, item: WorkOrderService): WorkOrderServiceItemResponseDto {
    return {
      id: item.serviceId,
      name: item.service!.name,
      description: item.service!.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      status: item.status,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private static toPartSupplyItem(
    this: void,
    item: WorkOrderPartSupply,
  ): WorkOrderPartSupplyItemResponseDto {
    return {
      id: item.partSupplyId,
      name: item.partSupply!.name,
      description: item.partSupply!.description ?? null,
      sku: item.partSupply!.sku,
      partNumber: item.partSupply!.partNumber ?? null,
      category: item.partSupply!.category,
      unit: item.partSupply!.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  }
}
