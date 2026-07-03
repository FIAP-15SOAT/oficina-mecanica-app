import { PartSupply } from '@domain/entities/part-supply.entity';
import { StockMovement } from '@domain/entities/stock-movement.entity';
import { StockReservation } from '@domain/entities/stock-reservation.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  StockMovementPaginatedResponse,
  StockMovementResponse,
  StockPartSupplyResponse,
  StockReservationPaginatedResponse,
  StockReservationResponse,
  StockWorkOrderResponse,
} from './responses/stock.response';

export class StockPresenter {
  static toPaginatedStockMovementsResponse(
    result: PaginatedResult<StockMovement>,
  ): StockMovementPaginatedResponse {
    return {
      data: result.items.map((item) => StockPresenter.toStockMovementResponse(item)),
      pagination: result.pagination,
    };
  }

  static toPaginatedStockReservationsResponse(
    result: PaginatedResult<StockReservation>,
  ): StockReservationPaginatedResponse {
    return {
      data: result.items.map((item) => StockPresenter.toStockReservationResponse(item)),
      pagination: result.pagination,
    };
  }

  private static toStockMovementResponse(item: StockMovement): StockMovementResponse {
    return {
      id: item.id,
      partSupply: StockPresenter.mapPartSupplyData(item.partSupply!),
      workOrder: item.workOrder ? StockPresenter.mapWorkOrderData(item.workOrder) : null,
      type: item.type,
      quantity: item.quantity,
      reason: item.reason ?? null,
      createdAt: item.createdAt,
    };
  }

  private static toStockReservationResponse(item: StockReservation): StockReservationResponse {
    return {
      id: item.id,
      partSupply: StockPresenter.mapPartSupplyData(item.partSupply!),
      workOrder: StockPresenter.mapWorkOrderData(item.workOrder!),
      quantity: item.quantity,
      createdAt: item.createdAt,
    };
  }

  private static mapPartSupplyData(p: PartSupply): StockPartSupplyResponse {
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      sku: p.sku,
      partNumber: p.partNumber ?? null,
      category: p.category,
      unit: p.unit,
    };
  }

  private static mapWorkOrderData(wo: WorkOrder): StockWorkOrderResponse {
    return {
      id: wo.id,
      number: wo.number.toString(),
      customer: {
        id: wo.customer!.id,
        name: wo.customer!.name,
        type: wo.customer!.type,
        document: wo.customer!.document.value,
        phone: wo.customer!.phone.value,
        email: wo.customer!.email.value,
      },
      vehicle: {
        id: wo.vehicle!.id,
        plate: wo.vehicle!.plate.value,
        brand: wo.vehicle!.brand,
        model: wo.vehicle!.model,
        year: wo.vehicle!.year,
        color: wo.vehicle!.color ?? null,
      },
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
}
