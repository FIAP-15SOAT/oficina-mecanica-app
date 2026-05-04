import { FindWorkOrderQuotesUseCase } from '@application/use-cases/quote/find-work-order-quotes.use-case';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { Quote } from '@domain/entities/quote.entity';
import { WorkOrder } from '@domain/entities/work-order.entity';
import { QuoteStatus } from '@domain/enums/quote-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('FindWorkOrderQuotesUseCase', () => {
  let useCase: FindWorkOrderQuotesUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    quoteRepository = {
      findByWorkOrderId: jest.fn(),
    } as any;
    workOrderRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new FindWorkOrderQuotesUseCase(quoteRepository, workOrderRepository);
  });

  it('should return quotes for a work order', async () => {
    const workOrderId = 'wo-1';
    const workOrder = new WorkOrder({ customerId: 'c1', vehicleId: 'v1' });
    const quotes = [
      new Quote({ workOrderId, status: QuoteStatus.PENDING }),
      new Quote({ workOrderId, status: QuoteStatus.SENT }),
    ];

    workOrderRepository.findById.mockResolvedValue(workOrder);
    quoteRepository.findByWorkOrderId.mockResolvedValue(quotes);

    const result = await useCase.execute(workOrderId);

    expect(result).toEqual(quotes);
    expect(workOrderRepository.findById).toHaveBeenCalledWith(workOrderId);
    expect(quoteRepository.findByWorkOrderId).toHaveBeenCalledWith(workOrderId);
  });

  it('should throw ResourceNotFoundException if work order not found', async () => {
    const workOrderId = 'invalid-wo';
    workOrderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(workOrderId)).rejects.toThrow(ResourceNotFoundException);
    expect(quoteRepository.findByWorkOrderId).not.toHaveBeenCalled();
  });
});
