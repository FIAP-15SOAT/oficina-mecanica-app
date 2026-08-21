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
import { FindPendingQuotesForCustomerUseCase } from '@application/use-cases/quote/find-pending-quotes-for-customer.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';

import { ITokenService } from '@application/ports/output/token.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { QuoteController as QuoteCleanController } from '@interface-adapters/quote/quote.controller';
import { CustomerQuoteController as CustomerQuoteCleanController } from '@interface-adapters/quote/customer-quote.controller';
import { QuoteController } from './quote.controller';
import { CustomerQuoteController } from './customer-quote.controller';

@Module({
  imports: [InfrastructureServicesModule],
  // Ordem importa: CustomerQuoteController precisa vir ANTES de QuoteController.
  // Caso contrário, o Nest resolveria GET /quotes/me pela rota genérica
  // GET /quotes/:id do QuoteController (tratando "me" como um :id).
  controllers: [CustomerQuoteController, QuoteController],
  providers: [
    {
      provide: CustomerQuoteCleanController,
      useFactory: (quoteRepository: IQuoteRepository) =>
        new CustomerQuoteCleanController(new FindPendingQuotesForCustomerUseCase(quoteRepository)),
      inject: ['IQuoteRepository'],
    },
    {
      provide: QuoteCleanController,
      useFactory: (
        unitOfWork: IUnitOfWork,
        quoteRepository: IQuoteRepository,
        emailSender: IEmailSenderService,
        tokenService: ITokenService,
        configService: ConfigService,
      ) => {
        const quoteDecisionTokenSecret = configService.getOrThrow<string>(
          'QUOTE_DECISION_TOKEN_SECRET',
        );
        const quoteDecisionBaseUrl =
          configService.get<string>('QUOTE_DECISION_BASE_URL') ??
          `http://localhost:${configService.get<string>('PORT') ?? '3000'}/api`;

        const approveQuoteUseCase = new ApproveQuoteUseCase(unitOfWork);
        const rejectQuoteUseCase = new RejectQuoteUseCase(unitOfWork);

        return new QuoteCleanController(
          new CreateQuoteUseCase(unitOfWork),
          new FindQuoteByIdUseCase(quoteRepository),
          new AddQuoteServiceUseCase(unitOfWork),
          new RemoveQuoteServiceUseCase(unitOfWork),
          new AddQuotePartSupplyUseCase(unitOfWork),
          new RemoveQuotePartSupplyUseCase(unitOfWork),
          new UpdateQuoteServiceQuantityUseCase(unitOfWork),
          new UpdateQuotePartSupplyQuantityUseCase(unitOfWork),
          new SubmitQuoteUseCase(
            unitOfWork,
            emailSender,
            tokenService,
            quoteDecisionTokenSecret,
            quoteDecisionBaseUrl,
          ),
          new EmailDecisionQuoteUseCase(
            tokenService,
            approveQuoteUseCase,
            rejectQuoteUseCase,
            quoteDecisionTokenSecret,
          ),
          new UpdateQuoteStatusUseCase(approveQuoteUseCase, rejectQuoteUseCase),
          new FindAllQuotesPaginatedUseCase(quoteRepository),
        );
      },
      inject: [
        'IUnitOfWork',
        'IQuoteRepository',
        'IEmailSenderService',
        'ITokenService',
        ConfigService,
      ],
    },
  ],
})
export class QuoteModule {}
