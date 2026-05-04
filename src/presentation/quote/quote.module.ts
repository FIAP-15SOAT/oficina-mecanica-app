import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
import { JwtTokenService } from '@infrastructure/services/jwt-token.service';
import { MailerEmailSenderService } from '@infrastructure/services/mailer-email-sender.service';
import { JwtService } from '@nestjs/jwt';

import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IQuoteServiceRepository } from '@domain/interfaces/repositories/quote-service.repository.interface';
import { IQuotePartSupplyRepository } from '@domain/interfaces/repositories/quote-part-supply.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { IEmailSenderService } from '@domain/interfaces/services/email-sender.service.interface';

import { QuoteController } from './quote.controller';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  controllers: [QuoteController],
  providers: [
    { provide: 'IEmailSenderService', useClass: MailerEmailSenderService },
    { provide: 'ITokenService', useClass: JwtTokenService },
    JwtService,
    {
      provide: 'ICreateQuoteUseCase',
      useFactory: (quoteRepo: IQuoteRepository, workOrderRepo: IWorkOrderRepository) =>
        new CreateQuoteUseCase(quoteRepo, workOrderRepo),
      inject: ['IQuoteRepository', 'IWorkOrderRepository'],
    },
    {
      provide: 'IFindQuoteByIdUseCase',
      useFactory: (
        quoteRepo: IQuoteRepository,
        quoteServiceRepo: IQuoteServiceRepository,
        quotePartSupplyRepo: IQuotePartSupplyRepository,
      ) => new FindQuoteByIdUseCase(quoteRepo, quoteServiceRepo, quotePartSupplyRepo),
      inject: ['IQuoteRepository', 'IQuoteServiceRepository', 'IQuotePartSupplyRepository'],
    },
    {
      provide: 'IAddQuoteServiceUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new AddQuoteServiceUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IRemoveQuoteServiceUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new RemoveQuoteServiceUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IAddQuotePartSupplyUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new AddQuotePartSupplyUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IRemoveQuotePartSupplyUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new RemoveQuotePartSupplyUseCase(unitOfWork),
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
      useFactory: (unitOfWork: IUnitOfWork) => new UpdateQuoteServiceQuantityUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateQuotePartSupplyQuantityUseCase',
      useFactory: (unitOfWork: IUnitOfWork) => new UpdateQuotePartSupplyQuantityUseCase(unitOfWork),
      inject: ['IUnitOfWork'],
    },
    {
      provide: 'IUpdateQuoteStatusUseCase',
      useFactory: (approveUseCase: ApproveQuoteUseCase, rejectUseCase: RejectQuoteUseCase) =>
        new UpdateQuoteStatusUseCase(approveUseCase, rejectUseCase),
      inject: ['IApproveQuoteUseCase', 'IRejectQuoteUseCase'],
    },
    {
      provide: 'IEmailDecisionQuoteUseCase',
      useFactory: (
        tokenService: ITokenService,
        approveUseCase: ApproveQuoteUseCase,
        rejectUseCase: RejectQuoteUseCase,
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
