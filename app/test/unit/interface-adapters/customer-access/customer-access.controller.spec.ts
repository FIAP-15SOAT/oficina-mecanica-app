import { randomUUID } from 'node:crypto';

import { CustomerAccessController } from '@interface-adapters/customer-access/customer-access.controller';
import { CustomerAccessPresenter } from '@interface-adapters/customer-access/customer-access.presenter';

import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';

describe('CustomerAccessController', () => {
  let controller: CustomerAccessController;
  let grantUseCase: { execute: jest.Mock };

  beforeEach(() => {
    grantUseCase = { execute: jest.fn() };

    controller = new CustomerAccessController(
      grantUseCase as unknown as GrantCustomerAccessUseCase,
    );
  });

  describe('grantAccess', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const customerId = randomUUID();
      const actingUserId = randomUUID();
      const input = { name: 'Operador', email: 'operador@example.com', cpf: '12345678909' };
      const result = { userId: randomUUID(), customerId, initialPasswordSent: true };

      grantUseCase.execute.mockResolvedValue(result);

      const response = await controller.grantAccess(customerId, actingUserId, input);

      expect(grantUseCase.execute).toHaveBeenCalledWith(customerId, actingUserId, input);
      expect(response).toEqual(CustomerAccessPresenter.toDataResponse(result));
    });
  });
});
