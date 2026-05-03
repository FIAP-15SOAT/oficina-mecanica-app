import { QuoteController } from '@presentation/quote/quote.controller';
import { randomUUID } from 'node:crypto';
import { QuotePresenter } from '@presentation/quote/quote.presenter';
import { Quote } from '@domain/entities/quote.entity';

describe('QuoteController', () => {
  let controller: QuoteController;
  let createQuoteUseCase: any;
  let findQuoteByIdUseCase: any;
  let addQuoteServiceUseCase: any;
  let removeQuoteServiceUseCase: any;
  let addQuotePartSupplyUseCase: any;
  let removeQuotePartSupplyUseCase: any;
  let updateQuoteServiceQuantityUseCase: any;
  let updateQuotePartSupplyQuantityUseCase: any;
  let submitQuoteUseCase: any;
  let emailDecisionQuoteUseCase: any;
  let updateQuoteStatusUseCase: any;
  let findAllQuotesPaginatedUseCase: any;

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
    const quote = { id: randomUUID(), ...dto };
    createQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.create(dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(createQuoteUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should find one quote', async () => {
    const id = randomUUID();
    const quote = { id, services: [], partsSupplies: [] };
    findQuoteByIdUseCase.execute.mockResolvedValue(quote);

    const result = await controller.findOne(id);

    expect(result).toEqual(QuotePresenter.toWithItemsResponse(quote as unknown as Quote));
    expect(findQuoteByIdUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should add a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 2 };
    const quote = { id };
    addQuoteServiceUseCase.execute.mockResolvedValue(quote);

    const result = await controller.addService(id, serviceId, dto as any);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(addQuoteServiceUseCase.execute).toHaveBeenCalledWith({ quoteId: id, serviceId, ...dto });
  });

  it('should update a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 3 };
    const quote = { id };
    updateQuoteServiceQuantityUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updateService(id, serviceId, dto as any);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(updateQuoteServiceQuantityUseCase.execute).toHaveBeenCalledWith({ quoteId: id, serviceId, ...dto });
  });

  it('should remove a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    removeQuoteServiceUseCase.execute.mockResolvedValue(undefined);

    await controller.removeService(id, serviceId);

    expect(removeQuoteServiceUseCase.execute).toHaveBeenCalledWith(id, serviceId);
  });

  it('should add a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    const dto = { quantity: 2 };
    const quote = { id };
    addQuotePartSupplyUseCase.execute.mockResolvedValue(quote);

    const result = await controller.addPartSupply(id, partSupplyId, dto as any);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(addQuotePartSupplyUseCase.execute).toHaveBeenCalledWith({ quoteId: id, partSupplyId, ...dto });
  });

  it('should update a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    const dto = { quantity: 3 };
    const quote = { id };
    updateQuotePartSupplyQuantityUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updatePartSupply(id, partSupplyId, dto as any);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(updateQuotePartSupplyQuantityUseCase.execute).toHaveBeenCalledWith({ quoteId: id, partSupplyId, ...dto });
  });

  it('should remove a part supply', async () => {
    const id = randomUUID();
    const partSupplyId = randomUUID();
    removeQuotePartSupplyUseCase.execute.mockResolvedValue(undefined);

    await controller.removePartSupply(id, partSupplyId);

    expect(removeQuotePartSupplyUseCase.execute).toHaveBeenCalledWith(id, partSupplyId);
  });

  it('should submit a quote', async () => {
    const id = randomUUID();
    const quote = { id };
    submitQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.submit(id);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(submitQuoteUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should update status', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const dto = { status: 'APPROVED' };
    const quote = { id };
    updateQuoteStatusUseCase.execute.mockResolvedValue(quote);

    const result = await controller.updateStatus(id, dto as any, { user: { id: userId } } as any);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(updateQuoteStatusUseCase.execute).toHaveBeenCalledWith(id, userId, dto);
  });

  it('should handle email decision', async () => {
    const id = randomUUID();
    const action = 'approve';
    const token = 'token123';
    const quote = { id };
    emailDecisionQuoteUseCase.execute.mockResolvedValue(quote);

    const result = await controller.emailDecision(id, { action: action as any, token });

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as any));
    expect(emailDecisionQuoteUseCase.execute).toHaveBeenCalledWith(id, action, token);
  });

  it('should list all quotes paginated', async () => {
    const resultUseCase = { items: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 } };
    findAllQuotesPaginatedUseCase.execute.mockResolvedValue(resultUseCase);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(result).toEqual(QuotePresenter.toPaginatedResponse(resultUseCase as any));
    expect(findAllQuotesPaginatedUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });

  it('should list all quotes with default pagination', async () => {
    findAllQuotesPaginatedUseCase.execute.mockResolvedValue({ items: [], pagination: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 } });

    await controller.findAll({});

    expect(findAllQuotesPaginatedUseCase.execute).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });
});
