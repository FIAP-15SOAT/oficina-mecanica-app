import { Quote } from '@domain/entities/quote.entity';
import { QuotePartSupply } from '@domain/entities/quote-part-supply.entity';
import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { AddQuotePartSupplyDto } from '@domain/interfaces/use-cases/quote/dto/add-quote-part-supply.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class AddQuotePartSupplyUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) { }

  async execute(dto: AddQuotePartSupplyDto): Promise<Quote> {
    return this.unitOfWork.executeTransaction(async (repos) => {
      const quote = await repos.quote.findById(dto.quoteId);

      if (!quote) {
        throw new ResourceNotFoundException('Orçamento', dto.quoteId);
      }

      quote.ensureCanChangeItems();

      const partSupply = await repos.partSupply.findById(dto.partSupplyId);

      if (!partSupply) {
        throw new ResourceNotFoundException('Peça/Insumo', dto.partSupplyId);
      }

      const existing = await repos.quotePartSupply.findOne(dto.quoteId, dto.partSupplyId);

      if (existing) {
        throw new ResourceConflictException(`Peça/Insumo já adicionado ao orçamento.`);
      }

      const quotePartSupply = QuotePartSupply.create({
        quoteId: dto.quoteId,
        partSupplyId: dto.partSupplyId,
        quantity: dto.quantity,
        unitPrice: partSupply.salePrice,
      });

      await repos.quotePartSupply.create(quotePartSupply);

      const [allServices, allParts] = await Promise.all([
        repos.quoteService.findByQuoteId(dto.quoteId),
        repos.quotePartSupply.findByQuoteId(dto.quoteId),
      ]);

      quote.services = allServices;
      quote.partsSupplies = allParts;
      quote.recalculateTotals();

      return repos.quote.update(quote);
    });
  }
}
