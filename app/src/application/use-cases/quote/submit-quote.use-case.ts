import { Quote } from '@domain/entities/quote.entity';
import { Customer } from '@domain/entities/customer.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';

import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { TokenType } from '@domain/enums/token-type.enum';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

import { ITokenService } from '@application/ports/output/token.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { IRepositories, IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import {
  IEmailSenderService,
  SendEmailInput,
} from '@application/ports/output/email-sender.service.interface';

import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

interface QuoteEmailDecisionTokenPayload extends Record<string, unknown> {
  quoteId: string;
  action: QuoteDecisionAction;
  type: TokenType;
}

export class SubmitQuoteUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailSender: IEmailSenderService,
    private readonly tokenService: ITokenService,
    private readonly decisionSecret: string,
    private readonly apiBaseUrl: string,
    private readonly logger: ILogger,
  ) {}

  async execute(quoteId: string): Promise<Quote> {
    const {
      quote: submittedQuote,
      workOrderId,
      workOrderNumber,
      previousQuoteStatus,
    } = await this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findByIdWithDetails(quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', quoteId);
      }

      const workOrder = (await repos.workOrder.findById(quote.workOrderId))!;

      workOrder.ensureCanSubmitQuote();

      const previousQuoteStatus = quote.status;

      quote.submit();

      const customer = (await repos.customer.findById(workOrder.customerId))!;

      const [updatedQuote] = await Promise.all([
        repos.quote.update(quote),
        this.updateWorkOrderStatus(repos, workOrder),
      ]);

      updatedQuote.workOrder = workOrder;

      await this.sendEmailNotification(quote, customer, workOrder.number.toString());

      return {
        quote: updatedQuote,
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.number.toString(),
        previousQuoteStatus,
      };
    });

    this.logger.event(BUSINESS_EVENTS.QUOTE_SUBMITTED, {
      quoteId: submittedQuote.id,
      previousQuoteStatus,
      workOrderId,
      workOrderNumber,
    });

    return submittedQuote;
  }

  private async updateWorkOrderStatus(repos: IRepositories, workOrder: WorkOrder): Promise<void> {
    if (
      workOrder.status !== WorkOrderStatus.IN_DIAGNOSIS &&
      workOrder.status !== WorkOrderStatus.REJECTED
    ) {
      return;
    }

    const previousStatus = workOrder.status;
    workOrder.changeStatus(WorkOrderStatus.AWAITING_APPROVAL);

    await Promise.all([
      repos.workOrder.update(workOrder),
      repos.statusHistory.create(
        StatusHistory.create({
          workOrderId: workOrder.id,
          previousStatus,
          newStatus: WorkOrderStatus.AWAITING_APPROVAL,
        }),
      ),
    ]);
  }

  private async sendEmailNotification(
    quote: Quote,
    customer: Customer,
    workOrderNumber: string,
  ): Promise<void> {
    const emailContent = this.buildEmailContent(quote, customer, workOrderNumber);
    await this.emailSender.send(emailContent);
  }

  private buildEmailContent(
    quote: Quote,
    customer: Customer,
    workOrderNumber: string,
  ): SendEmailInput {
    const approveToken = this.tokenService.signWithSecret(
      {
        quoteId: quote.id,
        action: QuoteDecisionAction.APPROVE,
        type: TokenType.QUOTE_EMAIL_DECISION,
      } satisfies QuoteEmailDecisionTokenPayload,
      this.decisionSecret,
      '7d',
    );

    const rejectToken = this.tokenService.signWithSecret(
      {
        quoteId: quote.id,
        action: QuoteDecisionAction.REJECT,
        type: TokenType.QUOTE_EMAIL_DECISION,
      } satisfies QuoteEmailDecisionTokenPayload,
      this.decisionSecret,
      '7d',
    );

    const approveLink = `${this.apiBaseUrl}/quotes/${quote.id}/decisions?token=${encodeURIComponent(approveToken)}`;
    const rejectLink = `${this.apiBaseUrl}/quotes/${quote.id}/decisions?token=${encodeURIComponent(rejectToken)}`;

    return {
      toEmail: customer.email.value,
      toName: customer.name,
      subject: `Orçamento para Ordem de Serviço ${workOrderNumber} - Aguardando sua aprovação`,
      message: {
        text:
          `Olá ${customer.name},\n\n` +
          `Seu orçamento para a Ordem de Serviço ${workOrderNumber} está pronto.\n` +
          `Valor total: R$ ${quote.totalAmount.toFixed(2)}\n\n` +
          `Para aprovar, acesse: ${approveLink}\n` +
          `Para reprovar, acesse: ${rejectLink}\n\n` +
          `Atenciosamente,\nEquipe da Oficina Mecânica`,
        html:
          `<p>Olá <strong>${customer.name}</strong>,</p>` +
          `<p>Seu orçamento para a Ordem de Serviço <strong>${workOrderNumber}</strong> está pronto.</p>` +
          `<p><strong>Valor total:</strong> R$ ${quote.totalAmount.toFixed(2)}</p>` +
          `<p><a href="${approveLink}">Aprovar orçamento</a></p>` +
          `<p><a href="${rejectLink}">Reprovar orçamento</a></p>` +
          `<p>Atenciosamente,<br/>Equipe da Oficina Mecânica</p>`,
      },
    };
  }
}
