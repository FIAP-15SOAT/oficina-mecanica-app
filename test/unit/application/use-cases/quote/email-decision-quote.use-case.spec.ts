import { randomUUID } from 'node:crypto';

import { EmailDecisionQuoteUseCase } from '@application/use-cases/quote/email-decision-quote.use-case';
import { IApproveQuoteUseCase } from '@application/ports/input/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@application/ports/input/quote/reject-quote.use-case.interface';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

import { ITokenService } from '@application/ports/output/token.service.interface';

import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { TokenType } from '@domain/enums/token-type.enum';

import { createMockQuote } from '../../../../helpers/quote-mock.factory';
import { createMockTokenService } from '../../../../helpers/mock-factories';

describe('EmailDecisionQuoteUseCase', () => {
  let useCase: EmailDecisionQuoteUseCase;
  let tokenService: jest.Mocked<ITokenService>;
  let approveUseCase: jest.Mocked<IApproveQuoteUseCase>;
  let rejectUseCase: jest.Mocked<IRejectQuoteUseCase>;
  const decisionSecret = 'test-secret';

  beforeEach(() => {
    tokenService = createMockTokenService();
    approveUseCase = {
      execute: jest.fn(),
    };
    rejectUseCase = {
      execute: jest.fn(),
    };

    useCase = new EmailDecisionQuoteUseCase(
      tokenService,
      approveUseCase,
      rejectUseCase,
      decisionSecret,
    );
  });

  const quoteId = randomUUID();
  const token = 'valid-token';

  it('should approve quote when token action is APPROVE', async () => {
    const payload = {
      quoteId,
      action: QuoteDecisionAction.APPROVE,
      type: TokenType.QUOTE_EMAIL_DECISION,
    };

    tokenService.verifyWithSecret.mockReturnValue(payload);
    approveUseCase.execute.mockResolvedValue(createMockQuote({ id: quoteId }));

    const result = await useCase.execute(quoteId, token);

    expect(result.id).toBe(quoteId);
    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith(token, decisionSecret);
    expect(approveUseCase.execute).toHaveBeenCalledWith(quoteId);
  });

  it('should reject quote when token action is REJECT', async () => {
    const payload = {
      quoteId,
      action: QuoteDecisionAction.REJECT,
      type: TokenType.QUOTE_EMAIL_DECISION,
    };

    tokenService.verifyWithSecret.mockReturnValue(payload);
    rejectUseCase.execute.mockResolvedValue(createMockQuote({ id: quoteId }));

    const result = await useCase.execute(quoteId, token);

    expect(result.id).toBe(quoteId);
    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith(token, decisionSecret);
    expect(rejectUseCase.execute).toHaveBeenCalledWith(quoteId);
  });

  it('should throw UnauthorizedAccessException when token is invalid', async () => {
    tokenService.verifyWithSecret.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await expect(useCase.execute(quoteId, token)).rejects.toThrow(UnauthorizedAccessException);
    await expect(useCase.execute(quoteId, token)).rejects.toThrow('Token inválido ou expirado.');
  });

  it('should throw UnauthorizedAccessException when payload type is invalid', async () => {
    const payload = {
      quoteId,
      action: QuoteDecisionAction.APPROVE,
      type: 'invalid-type' as never,
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);

    await expect(useCase.execute(quoteId, token)).rejects.toThrow(UnauthorizedAccessException);
    await expect(useCase.execute(quoteId, token)).rejects.toThrow('Token inválido para esta ação.');
  });

  it('should throw UnauthorizedAccessException when payload quoteId does not match', async () => {
    const payload = {
      quoteId: 'different-id',
      action: QuoteDecisionAction.APPROVE,
      type: TokenType.QUOTE_EMAIL_DECISION,
    };

    tokenService.verifyWithSecret.mockReturnValue(payload);

    await expect(useCase.execute(quoteId, token)).rejects.toThrow(UnauthorizedAccessException);
  });
});
