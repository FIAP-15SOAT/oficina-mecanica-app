import { Module } from '@nestjs/common';
import { AuthModule } from '@presentation/auth/auth.module';

import { CreateWorkOrderUseCase } from '@application/use-cases/work-order/create-work-order.use-case';
import { FindWorkOrderByIdUseCase } from '@application/use-cases/work-order/find-work-order-by-id.use-case';
import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { UpdateWorkOrderUseCase } from '@application/use-cases/work-order/update-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from '@application/use-cases/work-order/update-work-order-status.use-case';
import { UpdateWorkOrderServiceStatusUseCase } from '@application/use-cases/work-order/update-work-order-service-status.use-case';
import { FindWorkOrderStatusHistoryUseCase } from '@application/use-cases/work-order/find-work-order-status-history.use-case';

import { PrismaWorkOrderRepository } from '@infrastructure/repositories/prisma-work-order.repository';
import { PrismaStatusHistoryRepository } from '@infrastructure/repositories/prisma-status-history.repository';
import { PrismaUnitOfWork } from '@infrastructure/repositories/prisma-unit-of-work';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import { WorkOrderController } from './work-order.controller';

@Module({
  imports: [AuthModule],
  controllers: [WorkOrderController],
  providers: [
    { provide: 'IWorkOrderRepository', useClass: PrismaWorkOrderRepository },
    { provide: 'IStatusHistoryRepository', useClass: PrismaStatusHistoryRepository },
    { provide: 'IUnitOfWork', useClass: PrismaUnitOfWork },
    {
      provide: 'ICreateWorkOrderUseCase',
      useFactory: (unitOfWork: PrismaUnitOfWork) => new CreateWorkOrderUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IFindWorkOrderByIdUseCase',
      useFactory: (workOrderRepo: PrismaWorkOrderRepository) =>
        new FindWorkOrderByIdUseCase(workOrderRepo),
      inject: ['IWorkOrderRepository'],
    },
    {
      provide: 'IFindAllWorkOrdersPaginatedUseCase',
      useFactory: (workOrderRepo: PrismaWorkOrderRepository) =>
        new FindAllWorkOrdersPaginatedUseCase(workOrderRepo),
      inject: ['IWorkOrderRepository'],
    },
    {
      provide: 'IUpdateWorkOrderUseCase',
      useFactory: (workOrderRepo: IWorkOrderRepository, userRepo: IUserRepository) =>
        new UpdateWorkOrderUseCase(workOrderRepo, userRepo),
      inject: ['IWorkOrderRepository', 'IUserRepository'],
    },
    {
      provide: 'IUpdateWorkOrderStatusUseCase',
      useFactory: (unitOfWork: PrismaUnitOfWork) => new UpdateWorkOrderStatusUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateWorkOrderServiceStatusUseCase',
      useFactory: (unitOfWork: PrismaUnitOfWork) => new UpdateWorkOrderServiceStatusUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IFindWorkOrderStatusHistoryUseCase',
      useFactory: (
        statusHistoryRepo: PrismaStatusHistoryRepository,
        workOrderRepo: PrismaWorkOrderRepository,
      ) => new FindWorkOrderStatusHistoryUseCase(statusHistoryRepo, workOrderRepo),
      inject: ['IStatusHistoryRepository', 'IWorkOrderRepository'],
    },
  ],
})
export class WorkOrderModule { }
