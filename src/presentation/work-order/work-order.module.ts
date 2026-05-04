import { Module } from '@nestjs/common';

import { CreateWorkOrderUseCase } from '@application/use-cases/work-order/create-work-order.use-case';
import { FindWorkOrderByIdUseCase } from '@application/use-cases/work-order/find-work-order-by-id.use-case';
import { FindAllWorkOrdersPaginatedUseCase } from '@application/use-cases/work-order/find-all-work-orders-paginated.use-case';
import { UpdateWorkOrderUseCase } from '@application/use-cases/work-order/update-work-order.use-case';
import { UpdateWorkOrderStatusUseCase } from '@application/use-cases/work-order/update-work-order-status.use-case';
import { UpdateWorkOrderServiceStatusUseCase } from '@application/use-cases/work-order/update-work-order-service-status.use-case';
import { FindWorkOrderStatusHistoryUseCase } from '@application/use-cases/work-order/find-work-order-status-history.use-case';
import { FindWorkOrderQuotesUseCase } from '@application/use-cases/quote/find-work-order-quotes.use-case';

import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IStatusHistoryRepository } from '@domain/interfaces/repositories/status-history.repository.interface';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { WorkOrderController } from './work-order.controller';

@Module({
  controllers: [WorkOrderController],
  providers: [
    {
      provide: 'IFindWorkOrderQuotesUseCase',
      useFactory: (quoteRepo: IQuoteRepository, workOrderRepo: IWorkOrderRepository) =>
        new FindWorkOrderQuotesUseCase(quoteRepo, workOrderRepo),
      inject: ['IQuoteRepository', 'IWorkOrderRepository'],
    },
    {
      provide: 'ICreateWorkOrderUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new CreateWorkOrderUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IFindWorkOrderByIdUseCase',
      useFactory: (workOrderRepo: IWorkOrderRepository) =>
        new FindWorkOrderByIdUseCase(workOrderRepo),
      inject: ['IWorkOrderRepository'],
    },
    {
      provide: 'IFindAllWorkOrdersPaginatedUseCase',
      useFactory: (workOrderRepo: IWorkOrderRepository) =>
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
      useFactory: (unitOfWork: IUnitOfWork) => new UpdateWorkOrderStatusUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateWorkOrderServiceStatusUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new UpdateWorkOrderServiceStatusUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IFindWorkOrderStatusHistoryUseCase',
      useFactory: (
        statusHistoryRepo: IStatusHistoryRepository,
        workOrderRepo: IWorkOrderRepository,
      ) => new FindWorkOrderStatusHistoryUseCase(statusHistoryRepo, workOrderRepo),
      inject: ['IStatusHistoryRepository', 'IWorkOrderRepository'],
    },
  ],
})
export class WorkOrderModule {}
