import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';
import { GetMeUseCase } from '@application/use-cases/me/get-me.use-case';
import { ListMyWorkOrdersUseCase } from '@application/use-cases/me/list-my-work-orders.use-case';
import { GetMyWorkOrderUseCase } from '@application/use-cases/me/get-my-work-order.use-case';
import { ListMyWorkOrderQuotesUseCase } from '@application/use-cases/me/list-my-work-order-quotes.use-case';
import { GetMyQuoteUseCase } from '@application/use-cases/me/get-my-quote.use-case';
import { DecideMyQuoteUseCase } from '@application/use-cases/me/decide-my-quote.use-case';
import { ApproveQuoteUseCase } from '@application/use-cases/quote/approve-quote.use-case';
import { RejectQuoteUseCase } from '@application/use-cases/quote/reject-quote.use-case';
import { UpdateQuoteStatusUseCase } from '@application/use-cases/quote/update-quote-status.use-case';
import { CustomerAccessPolicy } from '@application/policies/customer-access.policy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';

import { MeController as MeCleanController } from '@interface-adapters/me/me.controller';
import { MeController } from './me.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [MeController],
  providers: [
    {
      provide: MeCleanController,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        userCustomerRepository: IUserCustomerRepository,
        workOrderRepository: IWorkOrderRepository,
        quoteRepository: IQuoteRepository,
        unitOfWork: IUnitOfWork,
        logger: ILogger,
      ) => {
        const customerAccessPolicy = new CustomerAccessPolicy(userCustomerRepository);
        const approveQuoteUseCase = new ApproveQuoteUseCase(
          unitOfWork,
          logger.forContext(ApproveQuoteUseCase.name),
        );
        const rejectQuoteUseCase = new RejectQuoteUseCase(
          unitOfWork,
          logger.forContext(RejectQuoteUseCase.name),
        );
        const updateQuoteStatusUseCase = new UpdateQuoteStatusUseCase(
          approveQuoteUseCase,
          rejectQuoteUseCase,
        );

        return new MeCleanController(
          new ChangeOwnPasswordUseCase(
            userRepository,
            hashService,
            logger.forContext(ChangeOwnPasswordUseCase.name),
          ),
          new GetMeUseCase(userRepository, userCustomerRepository),
          new ListMyWorkOrdersUseCase(customerAccessPolicy, workOrderRepository),
          new GetMyWorkOrderUseCase(workOrderRepository, customerAccessPolicy),
          new ListMyWorkOrderQuotesUseCase(
            workOrderRepository,
            quoteRepository,
            customerAccessPolicy,
          ),
          new GetMyQuoteUseCase(quoteRepository, workOrderRepository, customerAccessPolicy),
          new DecideMyQuoteUseCase(
            quoteRepository,
            workOrderRepository,
            customerAccessPolicy,
            updateQuoteStatusUseCase,
          ),
        );
      },
      inject: [
        'IUserRepository',
        'IHashService',
        'IUserCustomerRepository',
        'IWorkOrderRepository',
        'IQuoteRepository',
        'IUnitOfWork',
        'ILogger',
      ],
    },
  ],
})
export class MeModule {}
