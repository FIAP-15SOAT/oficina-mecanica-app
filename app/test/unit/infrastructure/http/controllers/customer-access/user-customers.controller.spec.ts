import { randomUUID } from 'node:crypto';

import { UserCustomersController } from '@infrastructure/http/controllers/customer-access/user-customers.controller';
import { CustomerAccessController as CustomerAccessCleanController } from '@interface-adapters/customer-access/customer-access.controller';
import { CustomerAccessPresenter } from '@interface-adapters/customer-access/customer-access.presenter';

import { CustomerType } from '@domain/enums/customer-type.enum';

describe('UserCustomersController', () => {
  let httpController: UserCustomersController;
  let cleanController: CustomerAccessCleanController;

  beforeEach(() => {
    cleanController = new CustomerAccessCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new UserCustomersController(cleanController);
  });

  describe('listUserCustomers', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const userId = randomUUID();
      const response = CustomerAccessPresenter.toLinkedCustomerListResponse([
        {
          id: randomUUID(),
          name: 'Oficina Parceira LTDA',
          type: CustomerType.COMPANY,
          isActive: true,
        },
      ]);
      jest.spyOn(cleanController, 'listUserCustomers').mockResolvedValue(response);

      const result = await httpController.listUserCustomers(userId);

      expect(result).toBe(response);
      expect(cleanController.listUserCustomers).toHaveBeenCalledWith(userId);
    });
  });
});
