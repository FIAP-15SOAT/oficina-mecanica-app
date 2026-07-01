import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateQuoteUseCase } from '@application/use-cases/quote/create-quote.use-case';
import { FindQuoteByIdUseCase } from '@application/use-cases/quote/find-quote-by-id.use-case';
import { AddQuoteServiceUseCase } from '@application/use-cases/quote/add-quote-service.use-case';
import { RemoveQuoteServiceUseCase } from '@application/use-cases/quote/remove-quote-service.use-case';
import { AddQuotePartSupplyUseCase } from '@application/use-cases/quote/add-quote-part-supply.use-case';
import { RemoveQuotePartSupplyUseCase } from '@application/use-cases/quote/remove-quote-part-supply.use-case';
import { UpdateQuoteServiceQuantityUseCase } from '@application/use-cases/quote/update-quote-service-quantity.use-case';
import { UpdateQuotePartSupplyQuantityUseCase } from '@application/use-cases/quote/update-quote-part-supply-quantity.use-case';
import { SubmitQuoteUseCase } from '@application/use-cases/quote/submit-quote.use-case';
import { ApproveQuoteUseCase } from '@application/use-cases/quote/approve-quote.use-case';
import { RejectQuoteUseCase } from '@application/use-cases/quote/reject-quote.use-case';
import { UpdateQuoteStatusUseCase } from '@application/use-cases/quote/update-quote-status.use-case';
import { EmailDecisionQuoteUseCase } from '@application/use-cases/quote/email-decision-quote.use-case';
import { FindAllQuotesPaginatedUseCase } from '@application/use-cases/quote/find-all-quotes-paginated.use-case';
import { FindWorkOrderQuotesUseCase } from '@application/use-cases/quote/find-work-order-quotes.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { ITokenService } from '@application/ports/output/token.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { IApproveQuoteUseCase } from '@application/ports/input/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@application/ports/input/quote/reject-quote.use-case.interface';

import { QuoteController } from './quote.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [QuoteController],
  providers: [
    {
      provide: 'ICreateQuoteUseCase',
      useFactory: (uow: IUnitOfWork) => new CreateQuoteUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IFindQuoteByIdUseCase',
      useFactory: (quoteRepo: IQuoteRepository) => new FindQuoteByIdUseCase(quoteRepo),
      inject: ['IQuoteRepository'],
    },
    {
      provide: 'IAddQuoteServiceUseCase',
      useFactory: (uow: IUnitOfWork) => new AddQuoteServiceUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IRemoveQuoteServiceUseCase',
      useFactory: (uow: IUnitOfWork) => new RemoveQuoteServiceUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IAddQuotePartSupplyUseCase',
      useFactory: (uow: IUnitOfWork) => new AddQuotePartSupplyUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IRemoveQuotePartSupplyUseCase',
      useFactory: (uow: IUnitOfWork) => new RemoveQuotePartSupplyUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'ISubmitQuoteUseCase',
      useFactory: (
        unitOfWork: IUnitOfWork,
        emailSender: IEmailSenderService,
        tokenService: ITokenService,
        configService: ConfigService,
      ) =>
        new SubmitQuoteUseCase(
          unitOfWork,
          emailSender,
          tokenService,
          configService.getOrThrow<string>('QUOTE_DECISION_TOKEN_SECRET'),
          configService.get<string>('QUOTE_DECISION_BASE_URL') ??
            `http://localhost:${configService.get<string>('PORT') ?? '3000'}/api`,
        ),
      inject: ['IUnitOfWork', 'IEmailSenderService', 'ITokenService', ConfigService],
    },
    {
      provide: 'IApproveQuoteUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new ApproveQuoteUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IRejectQuoteUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new RejectQuoteUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateQuoteServiceQuantityUseCase',
      useFactory: (uow: IUnitOfWork) => new UpdateQuoteServiceQuantityUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateQuotePartSupplyQuantityUseCase',
      useFactory: (uow: IUnitOfWork) => new UpdateQuotePartSupplyQuantityUseCase(uow),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateQuoteStatusUseCase',
      useFactory: (approveUseCase: IApproveQuoteUseCase, rejectUseCase: IRejectQuoteUseCase) =>
        new UpdateQuoteStatusUseCase(approveUseCase, rejectUseCase),
      inject: ['IApproveQuoteUseCase', 'IRejectQuoteUseCase'],
    },
    {
      provide: 'IEmailDecisionQuoteUseCase',
      useFactory: (
        tokenService: ITokenService,
        approveUseCase: IApproveQuoteUseCase,
        rejectUseCase: IRejectQuoteUseCase,
        configService: ConfigService,
      ) =>
        new EmailDecisionQuoteUseCase(
          tokenService,
          approveUseCase,
          rejectUseCase,
          configService.getOrThrow<string>('QUOTE_DECISION_TOKEN_SECRET'),
        ),
      inject: ['ITokenService', 'IApproveQuoteUseCase', 'IRejectQuoteUseCase', ConfigService],
    },
    {
      provide: 'IFindAllQuotesPaginatedUseCase',
      useFactory: (quoteRepo: IQuoteRepository) => new FindAllQuotesPaginatedUseCase(quoteRepo),
      inject: ['IQuoteRepository'],
    },
    {
      provide: 'IFindWorkOrderQuotesUseCase',
      useFactory: (quoteRepo: IQuoteRepository, workOrderRepo: IWorkOrderRepository) =>
        new FindWorkOrderQuotesUseCase(quoteRepo, workOrderRepo),
      inject: ['IQuoteRepository', 'IWorkOrderRepository'],
    },
  ],
})
export class QuoteModule {}
