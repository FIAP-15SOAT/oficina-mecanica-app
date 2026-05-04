import { ICustomerRepository } from './customer.repository.interface';
import { IVehicleRepository } from './vehicle.repository.interface';
import { IWorkOrderRepository } from './work-order.repository.interface';
import { IWorkOrderServiceRepository } from './work-order-service.repository.interface';
import { IWorkOrderPartSupplyRepository } from './work-order-part-supply.repository.interface';
import { IQuoteRepository } from './quote.repository.interface';
import { IQuoteServiceRepository } from './quote-service.repository.interface';
import { IQuotePartSupplyRepository } from './quote-part-supply.repository.interface';
import { IStatusHistoryRepository } from './status-history.repository.interface';
import { IStockReservationRepository } from './stock-reservation.repository.interface';
import { IStockMovementRepository } from './stock-movement.repository.interface';
import { IPartSupplyRepository } from './part-supply.repository.interface';
import { IServiceRepository } from './service.repository.interface';
import { IUserRepository } from './user.repository.interface';

export interface IRepositories {
  customer: ICustomerRepository;
  vehicle: IVehicleRepository;
  workOrder: IWorkOrderRepository;
  workOrderService: IWorkOrderServiceRepository;
  workOrderPartSupply: IWorkOrderPartSupplyRepository;
  quote: IQuoteRepository;
  quoteService: IQuoteServiceRepository;
  quotePartSupply: IQuotePartSupplyRepository;
  statusHistory: IStatusHistoryRepository;
  stockReservation: IStockReservationRepository;
  stockMovement: IStockMovementRepository;
  partSupply: IPartSupplyRepository;
  service: IServiceRepository;
  user: IUserRepository;
}

export interface IUnitOfWork {
  executeTransaction<T>(work: (repositories: IRepositories) => Promise<T>): Promise<T>;
}
