import { Quote } from '@domain/entities/quote.entity';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { IApproveQuoteUseCase } from '@domain/interfaces/use-cases/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@domain/interfaces/use-cases/quote/reject-quote.use-case.interface';
import { IEmailDecisionQuoteUseCase } from '@domain/interfaces/use-cases/quote/email-decision-quote.use-case.interface';
import { QuoteEmailDecisionAction } from '@domain/enums/quote-email-decision-action.enum';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

interface QuoteEmailDecisionTokenPayload {
  quoteId: string;
  action: string;
  type: string;
}

export class EmailDecisionQuoteUseCase implements IEmailDecisionQuoteUseCase {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly approveQuoteUseCase: IApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: IRejectQuoteUseCase,
    private readonly decisionSecret: string,
  ) { }

  async execute(quoteId: string, action: QuoteEmailDecisionAction, token: string): Promise<Quote> {
    const payload = this.verifyToken(token);

    this.validatePayload(payload, quoteId, action);

    if (action === QuoteEmailDecisionAction.APPROVE) {
      return this.approveQuoteUseCase.execute(quoteId);
    }

    return this.rejectQuoteUseCase.execute(quoteId);
  }

  private verifyToken(token: string): QuoteEmailDecisionTokenPayload {
    try {
      return this.tokenService.verifyWithSecret<QuoteEmailDecisionTokenPayload>(
        token,
        this.decisionSecret,
      );
    } catch {
      throw new UnauthorizedAccessException('Token inválido ou expirado.');
    }
  }

  private validatePayload(
    payload: QuoteEmailDecisionTokenPayload,
    quoteId: string,
    action: string,
  ): void {
    if (
      payload.type !== 'quote-email-decision' ||
      payload.quoteId !== quoteId ||
      payload.action !== action
    ) {
      throw new UnauthorizedAccessException('Token inválido para esta ação.');
    }
  }
}
