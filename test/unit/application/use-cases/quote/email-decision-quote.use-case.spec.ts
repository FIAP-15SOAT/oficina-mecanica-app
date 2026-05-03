import { BadRequestException } from '@application/exceptions/bad-request.exception';
import { EmailDecisionQuoteUseCase } from '@application/use-cases/quote/email-decision-quote.use-case';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { IApproveQuoteUseCase } from '@domain/interfaces/use-cases/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@domain/interfaces/use-cases/quote/reject-quote.use-case.interface';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { QuoteEmailDecisionAction } from '@domain/enums/quote-email-decision-action.enum';
import { randomUUID } from 'node:crypto';

describe('EmailDecisionQuoteUseCase', () => {
  let useCase: EmailDecisionQuoteUseCase;
  let tokenService: jest.Mocked<ITokenService>;
  let approveUseCase: jest.Mocked<IApproveQuoteUseCase>;
  let rejectUseCase: jest.Mocked<IRejectQuoteUseCase>;
  const decisionSecret = 'test-secret';

  beforeEach(() => {
    tokenService = {
      verifyWithSecret: jest.fn(),
    } as any;
    approveUseCase = {
      execute: jest.fn(),
    } as any;
    rejectUseCase = {
      execute: jest.fn(),
    } as any;

    useCase = new EmailDecisionQuoteUseCase(
      tokenService,
      approveUseCase,
      rejectUseCase,
      decisionSecret,
    );
  });

  const quoteId = randomUUID();
  const token = 'valid-token';

  it('should approve quote when action is APPROVE', async () => {
    const payload = {
      quoteId,
      action: QuoteEmailDecisionAction.APPROVE,
      type: 'quote-email-decision',
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);
    approveUseCase.execute.mockResolvedValue({ id: quoteId } as any);

    const result = await useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token);

    expect(result.id).toBe(quoteId);
    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith(token, decisionSecret);
    expect(approveUseCase.execute).toHaveBeenCalledWith(quoteId);
  });

  it('should reject quote when action is REJECT', async () => {
    const payload = {
      quoteId,
      action: QuoteEmailDecisionAction.REJECT,
      type: 'quote-email-decision',
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);
    rejectUseCase.execute.mockResolvedValue({ id: quoteId } as any);

    const result = await useCase.execute(quoteId, QuoteEmailDecisionAction.REJECT, token);

    expect(result.id).toBe(quoteId);
    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith(token, decisionSecret);
    expect(rejectUseCase.execute).toHaveBeenCalledWith(quoteId);
  });

  it('should throw UnauthorizedAccessException when token is invalid', async () => {
    tokenService.verifyWithSecret.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      UnauthorizedAccessException,
    );
    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      'Token inválido ou expirado.',
    );
  });

  it('should throw UnauthorizedAccessException when payload type is invalid', async () => {
    const payload = {
      quoteId,
      action: QuoteEmailDecisionAction.APPROVE,
      type: 'invalid-type',
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);

    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      UnauthorizedAccessException,
    );
    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      'Token inválido para esta ação.',
    );
  });

  it('should throw UnauthorizedAccessException when payload quoteId does not match', async () => {
    const payload = {
      quoteId: 'different-id',
      action: QuoteEmailDecisionAction.APPROVE,
      type: 'quote-email-decision',
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);

    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });

  it('should throw UnauthorizedAccessException when payload action does not match', async () => {
    const payload = {
      quoteId,
      action: QuoteEmailDecisionAction.REJECT,
      type: 'quote-email-decision',
    };
    tokenService.verifyWithSecret.mockReturnValue(payload);

    await expect(useCase.execute(quoteId, QuoteEmailDecisionAction.APPROVE, token)).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });
});
