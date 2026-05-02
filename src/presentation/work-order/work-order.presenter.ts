import { WorkOrder } from '@domain/entities/work-order.entity';
import {
  WorkOrderAssignedUserResponseDto,
  WorkOrderCustomerResponseDto,
  WorkOrderDataResponseDto,
  WorkOrderPaginatedResponseDto,
  WorkOrderResponseDto,
  WorkOrderVehicleResponseDto,
} from './dto/work-order-response.dto';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { Customer } from '@domain/entities/customer.entity';
import { Vehicle } from '@domain/entities/vehicle.entity';
import { User } from '@domain/entities/user.entity';

export class WorkOrderPresenter {
  static toResponse(workOrder: WorkOrder): WorkOrderResponseDto {
    return {
      id: workOrder.id,
      number: workOrder.number,
      customerId: workOrder.customerId,
      vehicleId: workOrder.vehicleId,
      assignedUserId: workOrder.assignedUserId,
      customer: workOrder.customer
        ? WorkOrderPresenter.toCustomer(workOrder.customer)
        : ({ id: workOrder.customerId } as WorkOrderCustomerResponseDto),
      vehicle: workOrder.vehicle
        ? WorkOrderPresenter.toVehicle(workOrder.vehicle)
        : ({ id: workOrder.vehicleId } as WorkOrderVehicleResponseDto),
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

  static toDataResponse(workOrder: WorkOrder): WorkOrderDataResponseDto {
    return { data: WorkOrderPresenter.toResponse(workOrder) };
  }

  static toPaginatedResponse(paginatedResult: PaginatedResult<WorkOrder>): WorkOrderPaginatedResponseDto {
    const { items, pagination } = paginatedResult;
    return {
      data: items.map(WorkOrderPresenter.toResponse),
      pagination,
    };
  }

  private static toCustomer(customer: Customer): WorkOrderCustomerResponseDto {
    return {
      id: customer.id,
      name: customer.name,
      type: customer.type,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
    };
  }

  private static toVehicle(vehicle: Vehicle): WorkOrderVehicleResponseDto {
    return {
      id: vehicle.id,
      plate: vehicle.plate,
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
      email: user.email,
      role: user.role,
    };
  }
}
