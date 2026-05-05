import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  StockMovementResponseDto,
  StockMovementPartSupplyDto,
  StockMovementWorkOrderDto,
} from './dto/stock-movement-response.dto';
import {
  StockReservationResponseDto,
  StockReservationPartSupplyDto,
  StockReservationWorkOrderDto,
} from './dto/stock-reservation-response.dto';

export class StockPresenter {
  static toPaginatedStockMovementsResponse(result: PaginatedResult<StockMovement>) {
    return {
      data: result.items.map((item) => StockPresenter.toStockMovementResponse(item)),
      pagination: result.pagination,
    };
  }

  static toPaginatedStockReservationsResponse(result: PaginatedResult<StockReservation>) {
    return {
      data: result.items.map((item) => StockPresenter.toStockReservationResponse(item)),
      pagination: result.pagination,
    };
  }

  private static toStockMovementResponse(item: StockMovement): StockMovementResponseDto {
    return {
      id: item.id,
      partSupply: item.partSupply
        ? StockPresenter.toMovementPartSupply(item)
        : ({ id: item.partSupplyId } as StockMovementPartSupplyDto),
      workOrder: item.workOrder ? StockPresenter.toMovementWorkOrder(item.workOrder) : null,
      type: item.type,
      quantity: item.quantity,
      reason: item.reason ?? null,
      createdAt: item.createdAt,
    };
  }

  private static toStockReservationResponse(item: StockReservation): StockReservationResponseDto {
    return {
      id: item.id,
      partSupply: item.partSupply
        ? StockPresenter.toReservationPartSupply(item)
        : ({ id: item.partSupplyId } as StockReservationPartSupplyDto),
      workOrder: item.workOrder
        ? StockPresenter.toReservationWorkOrder(item.workOrder)
        : ({ id: item.workOrderId } as StockReservationWorkOrderDto),
      quantity: item.quantity,
      createdAt: item.createdAt,
    };
  }

  private static mapPartSupplyData(p: PartSupply) {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      sku: p.sku,
      partNumber: p.partNumber ?? null,
      category: p.category,
      unit: p.unit,
      quantity: p.stock,
    };
  }

  private static toMovementPartSupply(item: StockMovement): StockMovementPartSupplyDto {
    return StockPresenter.mapPartSupplyData(item.partSupply!);
  }

  private static toReservationPartSupply(item: StockReservation): StockReservationPartSupplyDto {
    return StockPresenter.mapPartSupplyData(item.partSupply!);
  }

  private static mapWorkOrderData(wo: WorkOrder) {
    return {
      id: wo.id,
      number: wo.number,
      customer: wo.customer
        ? {
            id: wo.customer.id,
            name: wo.customer.name,
            type: wo.customer.type,
            document: wo.customer.document.value,
            phone: wo.customer.phone.value,
            email: wo.customer.email.value,
          }
        : null,
      vehicle: wo.vehicle
        ? {
            id: wo.vehicle.id,
            plate: wo.vehicle.plate.value,
            brand: wo.vehicle.brand,
            model: wo.vehicle.model,
            year: wo.vehicle.year,
            color: wo.vehicle.color ?? null,
          }
        : null,
      assignedUser: wo.assignedUser
        ? {
            id: wo.assignedUser.id,
            name: wo.assignedUser.name,
            email: wo.assignedUser.email.value,
            role: wo.assignedUser.role,
          }
        : null,
    };
  }

  private static toMovementWorkOrder(wo: WorkOrder): StockMovementWorkOrderDto {
    return StockPresenter.mapWorkOrderData(wo);
  }

  private static toReservationWorkOrder(wo: WorkOrder): StockReservationWorkOrderDto {
    return StockPresenter.mapWorkOrderData(wo);
  }
}
