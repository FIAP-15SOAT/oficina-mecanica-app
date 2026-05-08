import { Global, Module } from '@nestjs/common';

import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaCustomerRepository } from './prisma-customer.repository';
import { PrismaVehicleRepository } from './prisma-vehicle.repository';
import { PrismaPartSupplyRepository } from './prisma-part-supply.repository';
import { PrismaServiceRepository } from './prisma-service.repository';
import { PrismaWorkOrderRepository } from './prisma-work-order.repository';
import { PrismaQuoteRepository } from './prisma-quote.repository';
import { PrismaStatusHistoryRepository } from './prisma-status-history.repository';
import { PrismaStockMovementRepository } from './prisma-stock-movement.repository';
import { PrismaStockReservationRepository } from './prisma-stock-reservation.repository';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

const REPOSITORY_PROVIDERS = [
  { provide: 'IUserRepository', useClass: PrismaUserRepository },
  { provide: 'ICustomerRepository', useClass: PrismaCustomerRepository },
  { provide: 'IVehicleRepository', useClass: PrismaVehicleRepository },
  { provide: 'IPartSupplyRepository', useClass: PrismaPartSupplyRepository },
  { provide: 'IServiceRepository', useClass: PrismaServiceRepository },
  { provide: 'IWorkOrderRepository', useClass: PrismaWorkOrderRepository },
  { provide: 'IQuoteRepository', useClass: PrismaQuoteRepository },
  { provide: 'IStatusHistoryRepository', useClass: PrismaStatusHistoryRepository },
  { provide: 'IStockMovementRepository', useClass: PrismaStockMovementRepository },
  { provide: 'IStockReservationRepository', useClass: PrismaStockReservationRepository },
  { provide: 'IUnitOfWork', useClass: PrismaUnitOfWork },
];

@Global()
@Module({
  providers: REPOSITORY_PROVIDERS,
  exports: REPOSITORY_PROVIDERS,
})
export class RepositoriesModule {}
