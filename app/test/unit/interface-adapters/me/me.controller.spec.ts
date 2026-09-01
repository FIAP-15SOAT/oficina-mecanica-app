import { randomUUID } from 'node:crypto';

import { MeController } from '@interface-adapters/me/me.controller';
import { MePresenter } from '@interface-adapters/me/me.presenter';

import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';
import { GetMeUseCase } from '@application/use-cases/me/get-me.use-case';
import { ListMyWorkOrdersUseCase } from '@application/use-cases/me/list-my-work-orders.use-case';
import { GetMyWorkOrderUseCase } from '@application/use-cases/me/get-my-work-order.use-case';
import { ListMyWorkOrderQuotesUseCase } from '@application/use-cases/me/list-my-work-order-quotes.use-case';
import { GetMyQuoteUseCase } from '@application/use-cases/me/get-my-quote.use-case';
import { DecideMyQuoteUseCase } from '@application/use-cases/me/decide-my-quote.use-case';

import { UserRole } from '@domain/enums/user-role.enum';
import { QuoteDecisionAction } from '@domain/enums/quote-decision-action.enum';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';

import { createMockWorkOrder } from '../../../helpers/work-order-mock.factory';
import { createMockQuote } from '../../../helpers/quote-mock.factory';

describe('MeController', () => {
  let controller: MeController;
  let changePasswordUseCase: { execute: jest.Mock };
  let getMeUseCase: { execute: jest.Mock };
  let listWorkOrdersUseCase: { execute: jest.Mock };
  let getWorkOrderUseCase: { execute: jest.Mock };
  let listWorkOrderQuotesUseCase: { execute: jest.Mock };
  let getQuoteUseCase: { execute: jest.Mock };
  let decideQuoteUseCase: { execute: jest.Mock };

  beforeEach(() => {
    changePasswordUseCase = { execute: jest.fn() };
    getMeUseCase = { execute: jest.fn() };
    listWorkOrdersUseCase = { execute: jest.fn() };
    getWorkOrderUseCase = { execute: jest.fn() };
    listWorkOrderQuotesUseCase = { execute: jest.fn() };
    getQuoteUseCase = { execute: jest.fn() };
    decideQuoteUseCase = { execute: jest.fn() };

    controller = new MeController(
      changePasswordUseCase as unknown as ChangeOwnPasswordUseCase,
      getMeUseCase as unknown as GetMeUseCase,
      listWorkOrdersUseCase as unknown as ListMyWorkOrdersUseCase,
      getWorkOrderUseCase as unknown as GetMyWorkOrderUseCase,
      listWorkOrderQuotesUseCase as unknown as ListMyWorkOrderQuotesUseCase,
      getQuoteUseCase as unknown as GetMyQuoteUseCase,
      decideQuoteUseCase as unknown as DecideMyQuoteUseCase,
    );
  });

  describe('changePassword', () => {
    it('should forward to the use case', async () => {
      const userId = randomUUID();
      const input = { currentPassword: 'old-pass', newPassword: 'new-pass' };

      changePasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.changePassword(userId, input);

      expect(changePasswordUseCase.execute).toHaveBeenCalledWith(userId, input);
    });
  });

  describe('getMe', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const principal: AuthenticatedPrincipal = {
        sub: randomUUID(),
        authFlow: 'INTERNAL',
        email: 'joao@example.com',
        role: UserRole.ATTENDANT,
      };
      const result = {
        id: principal.sub,
        name: 'João',
        email: principal.email,
        role: principal.role,
        customers: [],
      };

      getMeUseCase.execute.mockResolvedValue(result);

      const response = await controller.getMe(principal);

      expect(getMeUseCase.execute).toHaveBeenCalledWith(principal);
      expect(response).toEqual(MePresenter.toMeDataResponse(result));
    });
  });

  describe('listWorkOrders', () => {
    it('should forward to the use case and build a paginated response', async () => {
      const userId = randomUUID();
      const pagination = { page: 1, limit: 10 };
      const customerId = randomUUID();
      const workOrders = [createMockWorkOrder({ vehicle: undefined })];

      listWorkOrdersUseCase.execute.mockResolvedValue({ items: workOrders, total: 1 });

      const response = await controller.listWorkOrders(userId, pagination, customerId);

      expect(listWorkOrdersUseCase.execute).toHaveBeenCalledWith(userId, pagination, customerId);
      expect(response).toEqual(
        MePresenter.toWorkOrderPaginatedResponse({ items: workOrders, total: 1 }, pagination),
      );
    });
  });

  describe('getWorkOrder', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const userId = randomUUID();
      const workOrder = createMockWorkOrder({ vehicle: undefined });

      getWorkOrderUseCase.execute.mockResolvedValue(workOrder);

      const response = await controller.getWorkOrder(userId, workOrder.id);

      expect(getWorkOrderUseCase.execute).toHaveBeenCalledWith(userId, workOrder.id);
      expect(response).toEqual(MePresenter.toWorkOrderDataResponse(workOrder));
    });
  });

  describe('listWorkOrderQuotes', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const userId = randomUUID();
      const workOrderId = randomUUID();
      const quotes = [createMockQuote()];

      listWorkOrderQuotesUseCase.execute.mockResolvedValue(quotes);

      const response = await controller.listWorkOrderQuotes(userId, workOrderId);

      expect(listWorkOrderQuotesUseCase.execute).toHaveBeenCalledWith(userId, workOrderId);
      expect(response).toEqual(MePresenter.toQuoteListResponse(quotes));
    });
  });

  describe('getQuote', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const userId = randomUUID();
      const quote = createMockQuote();

      getQuoteUseCase.execute.mockResolvedValue(quote);

      const response = await controller.getQuote(userId, quote.id);

      expect(getQuoteUseCase.execute).toHaveBeenCalledWith(userId, quote.id);
      expect(response).toEqual(MePresenter.toQuoteDataResponse(quote));
    });
  });

  describe('decideQuote', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const userId = randomUUID();
      const quote = createMockQuote();
      const input = { action: QuoteDecisionAction.APPROVE };

      decideQuoteUseCase.execute.mockResolvedValue(quote);

      const response = await controller.decideQuote(userId, quote.id, input);

      expect(decideQuoteUseCase.execute).toHaveBeenCalledWith(userId, quote.id, input);
      expect(response).toEqual(MePresenter.toQuoteDataResponse(quote));
    });
  });
});
