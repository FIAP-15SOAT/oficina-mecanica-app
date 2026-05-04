import { CreateQuoteUseCase } from '@application/use-cases/quote/create-quote.use-case';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { IQuoteRepository } from '@domain/interfaces/repositories/quote.repository.interface';
import { IWorkOrderRepository } from '@domain/interfaces/repositories/work-order.repository.interface';
import { createMockQuote, createMockQuoteRepository } from '../../../../helpers/quote-mock.factory';
import {
  createMockWorkOrder,
  createMockWorkOrderRepository,
} from '../../../../helpers/work-order-mock.factory';

describe('CreateQuoteUseCase', () => {
  let useCase: CreateQuoteUseCase;
  let quoteRepository: jest.Mocked<IQuoteRepository>;
  let workOrderRepository: jest.Mocked<IWorkOrderRepository>;

  beforeEach(() => {
    quoteRepository = createMockQuoteRepository();
    workOrderRepository = createMockWorkOrderRepository();
    useCase = new CreateQuoteUseCase(quoteRepository, workOrderRepository);
  });

  it('should create a quote when WO is IN_DIAGNOSIS', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.IN_DIAGNOSIS });
    const quote = createMockQuote({ workOrderId: wo.id });

    workOrderRepository.findById.mockResolvedValue(wo);
    quoteRepository.create.mockResolvedValue(quote);

    const result = await useCase.execute({ workOrderId: wo.id });
    expect(result).toBe(quote);
  });

  it('should create a quote when WO is AWAITING_APPROVAL', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.AWAITING_APPROVAL });
    const quote = createMockQuote({ workOrderId: wo.id });

    workOrderRepository.findById.mockResolvedValue(wo);
    quoteRepository.create.mockResolvedValue(quote);

    const result = await useCase.execute({ workOrderId: wo.id });
    expect(result).toBe(quote);
  });

  it('should throw ResourceNotFoundException when WO not found', async () => {
    workOrderRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ workOrderId: 'bad-id' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should throw BusinessRuleViolationException when WO is RECEIVED', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.RECEIVED });
    workOrderRepository.findById.mockResolvedValue(wo);

    await expect(useCase.execute({ workOrderId: wo.id })).rejects.toThrow(
      BusinessRuleViolationException,
    );
  });

  it('should throw BusinessRuleViolationException when WO is COMPLETED', async () => {
    const wo = createMockWorkOrder({ status: WorkOrderStatus.COMPLETED });
    workOrderRepository.findById.mockResolvedValue(wo);

    await expect(useCase.execute({ workOrderId: wo.id })).rejects.toThrow(
      BusinessRuleViolationException,
    );
  });
});
