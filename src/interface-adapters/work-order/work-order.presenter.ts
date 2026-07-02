import { WorkOrder } from '@domain/entities/work-order.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrderService } from '@domain/entities/work-order-service.entity';
import { WorkOrderPartSupply } from '@domain/entities/work-order-part-supply.entity';
import { Customer } from '@domain/entities/customer.entity';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { User } from '@domain/entities/user.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  WorkOrderAssignedUserResponse,
  WorkOrderCustomerResponse,
  WorkOrderDataResponse,
  WorkOrderPaginatedResponse,
  WorkOrderPartSupplyItemResponse,
  WorkOrderResponse,
  WorkOrderServiceItemResponse,
  WorkOrderServiceItemDataResponse,
  WorkOrderVehicleResponse,
} from './responses/work-order.response';
import {
  StatusHistoryChangedByResponse,
  StatusHistoryListResponse,
  StatusHistoryResponse,
} from './responses/status-history.response';

export class WorkOrderPresenter {
  static toSummaryResponse(workOrder: WorkOrder): WorkOrderResponse {
    return {
      id: workOrder.id,
      number: workOrder.number.toString(),
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

  static toResponse(workOrder: WorkOrder): WorkOrderResponse {
    return {
      ...WorkOrderPresenter.toSummaryResponse(workOrder),
      services: workOrder.services.map((s) => WorkOrderPresenter.toServiceItem(s)),
      partSupplies: workOrder.partSupplies.map((p) => WorkOrderPresenter.toPartSupplyItem(p)),
    };
  }

  static toDataResponse(workOrder: WorkOrder): WorkOrderDataResponse {
    return { data: WorkOrderPresenter.toResponse(workOrder) };
  }

  static toPaginatedResponse(
    paginatedResult: PaginatedResult<WorkOrder>,
  ): WorkOrderPaginatedResponse {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map((wo) => WorkOrderPresenter.toSummaryResponse(wo)),
      pagination,
    };
  }

  static toStatusHistoryListResponse(history: StatusHistory[]): StatusHistoryListResponse {
    return {
      data: history.map(
        (entry): StatusHistoryResponse => ({
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

  static toServiceItemDataResponse(item: WorkOrderService): WorkOrderServiceItemDataResponse {
    return { data: WorkOrderPresenter.toServiceItem(item) };
  }

  private static toCustomer(customer: Customer): WorkOrderCustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      type: customer.type,
      document: customer.document.value,
      email: customer.email.value,
      phone: customer.phone.value,
    };
  }

  private static toVehicle(vehicle: Vehicle): WorkOrderVehicleResponse {
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

  private static toUser(user: User): WorkOrderAssignedUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
    };
  }

  private static toChangedBy(user: User): StatusHistoryChangedByResponse {
    return WorkOrderPresenter.toUser(user);
  }

  static toServiceItem(this: void, item: WorkOrderService): WorkOrderServiceItemResponse {
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
  ): WorkOrderPartSupplyItemResponse {
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
