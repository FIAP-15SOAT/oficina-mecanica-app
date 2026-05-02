import { Quote } from '@domain/entities/quote.entity';
import { IApproveQuoteUseCase } from '@domain/interfaces/use-cases/quote/approve-quote.use-case.interface';
import { IRejectQuoteUseCase } from '@domain/interfaces/use-cases/quote/reject-quote.use-case.interface';
import { IUpdateQuoteStatusUseCase, UpdateQuoteStatusDto } from '@domain/interfaces/use-cases/quote/update-quote-status.use-case.interface';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';

export class UpdateQuoteStatusUseCase implements IUpdateQuoteStatusUseCase {
  constructor(
    private readonly approveQuoteUseCase: IApproveQuoteUseCase,
    private readonly rejectQuoteUseCase: IRejectQuoteUseCase,
  ) { }

  async execute(quoteId: string, userId: string | null, dto: UpdateQuoteStatusDto): Promise<Quote> {
    if (dto.status === 'APPROVED') {
      return this.approveQuoteUseCase.execute(quoteId, userId);
    }

    if (dto.status === 'REJECTED') {
      if (!dto.reason) {
        throw new BusinessRuleViolationException('A justificativa é obrigatória para rejeitar um orçamento.');
      }
      return this.rejectQuoteUseCase.execute(quoteId, dto.reason, userId);
    }

    throw new BusinessRuleViolationException(`Status ${dto.status} não permitido para esta operação.`);
  }
}
