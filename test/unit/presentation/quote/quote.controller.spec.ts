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
    const quote = { id: randomUUID(), ...dto };
    createQuoteUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.create(dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
    expect(createQuoteUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('should find one quote', async () => {
    const id = randomUUID();
    const quote = { id, services: [], partsSupplies: [] };
    findQuoteByIdUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.findOne(id);

    expect(result).toEqual(QuotePresenter.toWithItemsResponse(quote as unknown as Quote));
    expect(findQuoteByIdUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should add a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 2 };
    const quote = { id };
    addQuoteServiceUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.addService(id, serviceId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
    expect(addQuoteServiceUseCase.execute).toHaveBeenCalledWith({ quoteId: id, serviceId, ...dto });
  });

  it('should update a service', async () => {
    const id = randomUUID();
    const serviceId = randomUUID();
    const dto = { quantity: 3 };
    const quote = { id };
    updateQuoteServiceQuantityUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.updateService(id, serviceId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
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
    const quote = { id };
    addQuotePartSupplyUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.addPartSupply(id, partSupplyId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
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
    const quote = { id };
    updateQuotePartSupplyQuantityUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.updatePartSupply(id, partSupplyId, dto);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
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
    const quote = { id };
    submitQuoteUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.submit(id);

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
    expect(submitQuoteUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should update status', async () => {
    const id = randomUUID();
    const userId = randomUUID();
    const dto = { status: 'APPROVED' };
    const quote = { id };
    updateQuoteStatusUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.updateStatus(
      id,
      dto as unknown as Parameters<typeof controller.updateStatus>[1],
      { sub: userId } as unknown as Parameters<typeof controller.updateStatus>[2],
    );

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
    expect(updateQuoteStatusUseCase.execute).toHaveBeenCalledWith(id, userId, dto);
  });

  it('should handle email decision', async () => {
    const id = randomUUID();
    const action = 'approve';
    const token = 'token123';
    const quote = { id };
    emailDecisionQuoteUseCase.execute.mockResolvedValue(quote as unknown as Quote);

    const result = await controller.emailDecision(id, {
      action: action as unknown as Parameters<typeof controller.emailDecision>[1]['action'],
      token,
    });

    expect(result).toEqual(QuotePresenter.toDataResponse(quote as unknown as Quote));
    expect(emailDecisionQuoteUseCase.execute).toHaveBeenCalledWith(id, action, token);
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
