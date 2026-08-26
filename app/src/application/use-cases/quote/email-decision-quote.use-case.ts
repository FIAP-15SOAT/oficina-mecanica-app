import { Quote } from '@domain/entities/quote.entity';
import { TokenType } from '@domain/enums/token-type.enum';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';

import { ITokenService } from '@application/ports/output/token.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import {
  BUSINESS_EVENTS,
  QuoteDecisionFailureReason,
} from '@application/logging/business-event.catalog';
import { IApproveQuoteUseCase } from '@application/ports/input/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@application/ports/input/quote/reject-quote.use-case.interface';
import { IEmailDecisionQuoteUseCase } from '@application/ports/input/quote/email-decision-quote.use-case.interface';

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
    private readonly logger: ILogger,
  ) {}

  async execute(quoteId: string, token: string): Promise<Quote> {
    const payload = this.verifyToken(token, quoteId);

    this.validatePayload(payload, quoteId);

    if (payload.action === QuoteDecisionAction.APPROVE) {
      return this.approveQuoteUseCase.execute(quoteId);
    }

    return this.rejectQuoteUseCase.execute(quoteId);
  }

  private verifyToken(token: string, quoteId: string): QuoteEmailDecisionTokenPayload {
    try {
      return this.tokenService.verifyWithSecret<QuoteEmailDecisionTokenPayload>(
        token,
        this.decisionSecret,
      );
    } catch {
      this.logger.event(BUSINESS_EVENTS.QUOTE_DECISION_TOKEN_REJECTED, {
        quoteDecisionFailureReason: 'invalid_token',
        quoteId,
      });

      throw new UnauthorizedAccessException('Token inválido ou expirado.');
    }
  }

  private validatePayload(payload: QuoteEmailDecisionTokenPayload, quoteId: string): void {
    if (payload.type !== TokenType.QUOTE_EMAIL_DECISION) {
      this.rejectToken('token_type_mismatch', quoteId);
    }

    if (payload.quoteId !== quoteId) {
      this.rejectToken('quote_id_mismatch', quoteId);
    }
  }

  private rejectToken(reason: QuoteDecisionFailureReason, quoteId: string): never {
    this.logger.event(BUSINESS_EVENTS.QUOTE_DECISION_TOKEN_REJECTED, {
      quoteDecisionFailureReason: reason,
      quoteId,
    });

    throw new UnauthorizedAccessException('Token inválido para esta ação.');
  }
}
