import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { Quote } from '@domain/entities/quote.entity';
import { Customer } from '@domain/entities/customer.entity';
import { StatusHistory } from '@domain/entities/status-history.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { QuoteEmailDecisionAction } from '@domain/enums/quote-email-decision-action.enum';
import { TokenType } from '@domain/enums/token-type.enum';
import {
  IEmailSenderService,
  SendEmailInput,
} from '@domain/interfaces/services/email-sender.service.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

interface QuoteEmailDecisionTokenPayload extends Record<string, unknown> {
  quoteId: string;
  action: QuoteEmailDecisionAction;
  type: TokenType;
}

export class SubmitQuoteUseCase {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly emailSender: IEmailSenderService,
    private readonly tokenService: ITokenService,
  ) { }

  async execute(quoteId: string): Promise<Quote> {
    const { updatedQuote, customer, workOrderNumber } = await this.unitOfWork.executeTransaction(async (repos) => {
      const { quote, workOrder } = await this.validateQuoteAndWorkOrder(repos, quoteId);

      const savedQuote = await this.updateQuoteStatus(repos, quote);

      await this.updateWorkOrderStatus(repos, workOrder);

      const customerFound = await repos.customer.findById(workOrder.customerId);

      return {
        updatedQuote: savedQuote,
        customer: customerFound,
        workOrderNumber: workOrder.number
      };
    });

    if (customer && (customer as any).email) {
      await this.sendEmailNotification(updatedQuote, customer as Customer, workOrderNumber);
    }

    return updatedQuote;
  }

  private async validateQuoteAndWorkOrder(repos: any, quoteId: string) {
    const quote = await repos.quote.findById(quoteId);
    if (!quote) {
      throw new ResourceNotFoundException('Orçamento', quoteId);
    }

    quote.ensureCanSubmit();

    const [services, partsSupplies] = await Promise.all([
      repos.quoteService.findByQuoteId(quoteId),
      repos.quotePartSupply.findByQuoteId(quoteId),
    ]);

    if (services.length === 0 && partsSupplies.length === 0) {
      throw new ResourceConflictException(
        'O orçamento deve ter pelo menos um serviço ou peça/insumo antes de ser enviado.',
      );
    }

    const workOrder = await repos.workOrder.findById(quote.workOrderId);

    if (!workOrder) {
      throw new ResourceNotFoundException('Ordem de Serviço', quote.workOrderId);
    }

    return { quote, workOrder };
  }

  private async updateQuoteStatus(repos: any, quote: Quote): Promise<Quote> {
    const now = new Date();
    quote.status = QuoteStatus.SENT;
    quote.sentAt = now;
    quote.updatedAt = now;

    return repos.quote.update(quote);
  }

  private async updateWorkOrderStatus(repos: any, workOrder: any): Promise<void> {
    if (
      workOrder.status === WorkOrderStatus.IN_DIAGNOSIS ||
      workOrder.status === WorkOrderStatus.REJECTED
    ) {
      const previousStatus = workOrder.status;
      workOrder.changeStatus(WorkOrderStatus.AWAITING_APPROVAL);

      await repos.workOrder.update(workOrder);

      await repos.statusHistory.create(
        StatusHistory.create({
          workOrderId: workOrder.id,
          previousStatus,
          newStatus: WorkOrderStatus.AWAITING_APPROVAL,
        }),
      );
    }
  }

  private async sendEmailNotification(quote: Quote, customer: Customer, workOrderNumber: string): Promise<void> {
    const emailContent = this.buildEmailContent(quote, customer, workOrderNumber);
    await this.emailSender.send(emailContent);
  }

  private buildEmailContent(
    quote: Quote,
    customer: Customer,
    workOrderNumber: string,
  ): SendEmailInput {
    const decisionSecret = process.env.QUOTE_DECISION_TOKEN_SECRET!;

    if (!process.env.QUOTE_DECISION_TOKEN_SECRET) {
      throw new Error('QUOTE_DECISION_TOKEN_SECRET must be defined');
    }

    const apiBaseUrl =
      process.env.QUOTE_DECISION_BASE_URL ??
      `http://localhost:${process.env.PORT ?? '3000'}/api`;

    const approveToken = this.tokenService.signWithSecret(
      {
        quoteId: quote.id,
        action: QuoteEmailDecisionAction.APPROVE,
        type: TokenType.QUOTE_EMAIL_DECISION,
      } satisfies QuoteEmailDecisionTokenPayload,
      decisionSecret,
      '7d',
    );

    const rejectToken = this.tokenService.signWithSecret(
      {
        quoteId: quote.id,
        action: QuoteEmailDecisionAction.REJECT,
        type: TokenType.QUOTE_EMAIL_DECISION,
      } satisfies QuoteEmailDecisionTokenPayload,
      decisionSecret,
      '7d',
    );

    const approveLink = `${apiBaseUrl}/quotes/${quote.id}/decisions?action=approve&token=${encodeURIComponent(approveToken)}`;
    const rejectLink = `${apiBaseUrl}/quotes/${quote.id}/decisions?action=reject&token=${encodeURIComponent(rejectToken)}`;

    return {
      toEmail: customer.email,
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
