import { QuoteController } from '@presentation/quote/quote.controller';
import { randomUUID } from 'node:crypto';
import { QuotePresenter } from '@presentation/quote/quote.presenter';
import { Quote } from '@domain/entities/quote.entity';
import { ICreateQuoteUseCase } from '@domain/interfaces/use-cases/quote/create-quote.use-case.interface';
import { IFindQuoteByIdUseCase } from '@domain/interfaces/use-cases/quote/find-quote-by-id.use-case.interface';
import { IAddQuoteServiceUseCase } from '@domain/interfaces/use-cases/quote/add-quote-service.use-case.interface';
import { IRemoveQuoteServiceUseCase } from '@domain/interfaces/use-cases/quote/remove-quote-service.use-case.interface';
import { IAddQuotePartSupplyUseCase } from '@domain/interfaces/use-cases/quote/add-quote-part-supply.use-case.interface';
import { IRemoveQuotePartSupplyUseCase } from '@domain/interfaces/use-cases/quote/remove-quote-part-supply.use-case.interface';
import { IUpdateQuoteServiceQuantityUseCase } from '@domain/interfaces/use-cases/quote/update-quote-service-quantity.use-case.interface';
import { IUpdateQuotePartSupplyQuantityUseCase } from '@domain/interfaces/use-cases/quote/update-quote-part-supply-quantity.use-case.interface';
import { ISubmitQuoteUseCase } from '@domain/interfaces/use-cases/quote/submit-quote.use-case.interface';
import { IEmailDecisionQuoteUseCase } from '@domain/interfaces/use-cases/quote/email-decision-quote.use-case.interface';
import { IUpdateQuoteStatusUseCase } from '@domain/interfaces/use-cases/quote/update-quote-status.use-case.interface';
import { IFindAllQuotesPaginatedUseCase } from '@domain/interfaces/use-cases/quote/find-all-quotes-paginated.use-case.interface';
import { createMockQuote } from '../../../helpers/quote-mock.factory';
import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';
import { createMockVehicle } from '../../../helpers/vehicle-mock.factory';

function buildMockQuoteWithWorkOrder(): Quote {
  const customer = createMockCustomer();
  const vehicle = createMockVehicle({ customerId: customer.id });
  const workOrder = createMockWorkOrder({ customer, vehicle });
  const quote = createMockQuote({ services: [], partsSupplies: [] });
  quote.workOrder = workOrder;
  return quote;
}

describe('QuoteController', () => {
  let controller: QuoteController;
  let createQuoteUseCase: jest.Mocked<ICreateQuoteUseCase>;
  let findQuoteByIdUseCase: jest.Mocked<IFindQuoteByIdUseCase>;
  let addQuoteServiceUseCase: jest.Mocked<IAddQuoteServiceUseCase>;
  let removeQuoteServiceUseCase: jest.Mocked<IRemoveQuoteServiceUseCase>;
  let addQuotePartSupplyUseCase: jest.Mocked<IAddQuotePartSupplyUseCase>;
  let removeQuotePartSupplyUseCase: jest.Mocked<IRemoveQuotePartSupplyUseCase>;
  let updateQuoteServiceQuantityUseCase: jest.Mocked<IUpdateQuoteServiceQuantityUseCase>;
  let updateQuotePartSupplyQuantityUseCase: jest.Mocked<IUpdateQuotePartSupplyQuantityUseCase>;
  let submitQuoteUseCase: jest.Mocked<ISubmitQuoteUseCase>;
  let emailDecisionQuoteUseCase: jest.Mocked<IEmailDecisionQuoteUseCase>;
  let updateQuoteStatusUseCase: jest.Mocked<IUpdateQuoteStatusUseCase>;
  let findAllQuotesPaginatedUseCase: jest.Mocked<IFindAllQuotesPaginatedUseCase>;

  beforeEach(() => {
    createQuoteUseCase = { execute: jest.fn() };
    findQuoteByIdUseCase = { execute: jest.fn() };
    addQuoteServiceUseCase = { execute: jest.fn() };
    removeQuoteServiceUseCase = { execute: jest.fn() };
    addQuotePartSupplyUseCase = { execute: jest.fn() };
    removeQuotePartSupplyUseCase = { execute: jest.fn() };
    updateQuoteServiceQuantityUseCase = { execute: jest.fn() };
    updateQuotePartSupplyQuantityUseCase = { execute: jest.fn() };
    submitQuoteUseCase = { execute: jest.fn() };
    emailDecisionQuoteUseCase = { execute: jest.fn() };
    updateQuoteStatusUseCase = { execute: jest.fn() };
    findAllQuotesPaginatedUseCase = { execute: jest.fn() };

    controller = new QuoteController(
      createQuoteUseCase,
      findQuoteByIdUseCase,
      addQuoteServiceUseCase,
      removeQuoteServiceUseCase,
      addQuotePartSupplyUseCase,
      removeQuotePartSupplyUseCase,
      updateQuoteServiceQuantityUseCase,
      updateQuotePartSupplyQuantityUseCase,
      submitQuoteUseCase,
      emailDecisionQuoteUseCase,
      updateQuoteStatusUseCase,
      findAllQuotesPaginatedUseCase,
    );
  });

  it('should create a quote', async () => {
    const dto = { workOrderId: randomUUID(), notes: 'test' };
    const quote = buildMockQuoteWithWorkOrder();
    createQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.create(dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(createQuoteUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should find one quote', async () => {
    const id = randomUUID();
    const quote = buildMockQuoteWithWorkOrder();
    findQuoteByIdUseCase.execute.mockResolvedValue(quote);

    const result = await controller.findOne(id);

    expect(result).toEqual(QuotePresenter.toWithItemsResponse(quote));
    expect(findQuoteByIdUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should add a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 2 };
    const quote = buildMockQuoteWithWorkOrder();
    addQuoteServiceUseCase.execute.mockResolvedValue(quote);

    const result = await controller.addService(id, serviceId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(addQuoteServiceUseCase.execute).toHaveBeenCalledWith({ quoteId: id, serviceId, ...dto });
  });

  it('should update a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 3 };
    const quote = buildMockQuoteWithWorkOrder();
    updateQuoteServiceQuantityUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updateService(id, serviceId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(updateQuoteServiceQuantityUseCase.execute).toHaveBeenCalledWith({
      quoteId: id,
      serviceId,
      ...dto,
    });
  });

  it('should remove a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    removeQuoteServiceUseCase.execute.mockResolvedValue({} as unknown as Quote);

    await controller.removeService(id, serviceId);

    expect(removeQuoteServiceUseCase.execute).toHaveBeenCalledWith(id, serviceId);
  });

  it('should add a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    const dto = { quantity: 2 };
    const quote = buildMockQuoteWithWorkOrder();
    addQuotePartSupplyUseCase.execute.mockResolvedValue(quote);

    const result = await controller.addPartSupply(id, partSupplyId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(addQuotePartSupplyUseCase.execute).toHaveBeenCalledWith({
      quoteId: id,
      partSupplyId,
      ...dto,
    });
  });

  it('should update a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    const dto = { quantity: 3 };
    const quote = buildMockQuoteWithWorkOrder();
    updateQuotePartSupplyQuantityUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updatePartSupply(id, partSupplyId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(updateQuotePartSupplyQuantityUseCase.execute).toHaveBeenCalledWith({
      quoteId: id,
      partSupplyId,
      ...dto,
    });
  });

  it('should remove a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    removeQuotePartSupplyUseCase.execute.mockResolvedValue({} as unknown as Quote);

    await controller.removePartSupply(id, partSupplyId);

    expect(removeQuotePartSupplyUseCase.execute).toHaveBeenCalledWith(id, partSupplyId);
  });

  it('should submit a quote', async () => {
    const id = randomUUID();
    const quote = buildMockQuoteWithWorkOrder();
    submitQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.submit(id);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(submitQuoteUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should update status', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const dto = { status: 'APPROVED' };
    const quote = buildMockQuoteWithWorkOrder();
    updateQuoteStatusUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updateStatus(
      id,
      dto as unknown as Parameters<typeof controller.updateStatus>[1],
      { sub: userId } as unknown as Parameters<typeof controller.updateStatus>[2],
    );

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(updateQuoteStatusUseCase.execute).toHaveBeenCalledWith(id, userId, dto);
  });

  it('should handle email decision', async () => {
    const id = randomUUID();
    const token = 'token123';
    const quote = buildMockQuoteWithWorkOrder();
    emailDecisionQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.emailDecision(id, { token });

    expect(result).toEqual(QuotePresenter.toDataResponse(quote));
    expect(emailDecisionQuoteUseCase.execute).toHaveBeenCalledWith(id, token);
  });

  it('should list all quotes paginated', async () => {
    const resultUseCase = {
      items: [],
      pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
    };
    findAllQuotesPaginatedUseCase.execute.mockResolvedValue(resultUseCase);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(result).toEqual(
      QuotePresenter.toPaginatedResponse(
        resultUseCase as unknown as Parameters<typeof QuotePresenter.toPaginatedResponse>[0],
      ),
    );
    expect(findAllQuotesPaginatedUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });

  it('should list all quotes with default pagination', async () => {
    findAllQuotesPaginatedUseCase.execute.mockResolvedValue({
      items: [],
      pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 },
    });

    await controller.findAll({});

    expect(findAllQuotesPaginatedUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });
});
