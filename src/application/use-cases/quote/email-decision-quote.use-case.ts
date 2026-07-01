import { Quote } from '@domain/entities/quote.entity';
import { ITokenService } from '@application/ports/output/token.service.interface';
import { IApproveQuoteUseCase } from '@application/ports/input/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@application/ports/input/quote/reject-quote.use-case.interface';
import { IEmailDecisionQuoteUseCase } from '@application/ports/input/quote/email-decision-quote.use-case.interface';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { TokenType } from '@domain/enums/token-type.enum';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

interface QuoteEmailDecisionTokenPayload {
  quoteId: string;
  action: QuoteDecisionAction;
  type: TokenType;
}

export class EmailDecisionQuoteUseCase implements IEmailDecisionQuoteUseCase {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly approveQuoteUseCase: IApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: IRejectQuoteUseCase,
    private readonly decisionSecret: string,
  ) {}

  async execute(quoteId: string, token: string): Promise<Quote> {
    const payload = this.verifyToken(token);

    this.validatePayload(payload, quoteId);

    if (payload.action === QuoteDecisionAction.APPROVE) {
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

  private validatePayload(payload: QuoteEmailDecisionTokenPayload, quoteId: string): void {
    if (payload.type !== TokenType.QUOTE_EMAIL_DECISION || payload.quoteId !== quoteId) {
      throw new UnauthorizedAccessException('Token inválido para esta ação.');
    }
  }
}
