import { Injectable } from '@nestjs/common';
import { Quote } from '@domain/entities/quote.entity';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { IFindAllQuotesPaginatedUseCase } from '@domain/interfaces/use-cases/quote/find-all-quotes-paginated.use-case.interface';
import { FindAllQuotesPaginatedInput } from '@domain/interfaces/use-cases/quote/dto/find-all-quotes-paginated.dto';
import { buildPaginatedResult } from '@application/utils/pagination.util';

@Injectable()
export class FindAllQuotesPaginatedUseCase implements IFindAllQuotesPaginatedUseCase {
  constructor(private readonly quoteRepository: IQuoteRepository) {}

  async execute(input: FindAllQuotesPaginatedInput): Promise<PaginatedResult<Quote>> {
    const { page, limit, ...filters } = input;
    const pagination = { page, limit };

    const result = await this.quoteRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
