import { randomUUID } from 'node:crypto';

import { CustomerAccessController } from '@interface-adapters/customer-access/customer-access.controller';
import { CustomerAccessPresenter } from '@interface-adapters/customer-access/customer-access.presenter';

import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';
import { ListCustomerAccessUsersUseCase } from '@application/use-cases/customer-access/list-customer-access-users.use-case';
import { ListUserCustomersUseCase } from '@application/use-cases/customer-access/list-user-customers.use-case';
import { RevokeCustomerAccessUseCase } from '@application/use-cases/customer-access/revoke-customer-access.use-case';
import { UpdateCustomerStatusUseCase } from '@application/use-cases/customer-access/update-customer-status.use-case';

import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

describe('CustomerAccessController', () => {
  let controller: CustomerAccessController;
  let grantUseCase: { execute: jest.Mock };
  let listAccessUsersUseCase: { execute: jest.Mock };
  let listUserCustomersUseCase: { execute: jest.Mock };
  let revokeUseCase: { execute: jest.Mock };
  let updateStatusUseCase: { execute: jest.Mock };

  beforeEach(() => {
    grantUseCase = { execute: jest.fn() };
    listAccessUsersUseCase = { execute: jest.fn() };
    listUserCustomersUseCase = { execute: jest.fn() };
    revokeUseCase = { execute: jest.fn() };
    updateStatusUseCase = { execute: jest.fn() };

    controller = new CustomerAccessController(
      grantUseCase as unknown as GrantCustomerAccessUseCase,
      listAccessUsersUseCase as unknown as ListCustomerAccessUsersUseCase,
      listUserCustomersUseCase as unknown as ListUserCustomersUseCase,
      revokeUseCase as unknown as RevokeCustomerAccessUseCase,
      updateStatusUseCase as unknown as UpdateCustomerStatusUseCase,
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

  describe('listAccessUsers', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const customerId = randomUUID();
      const users = [
        {
          id: randomUUID(),
          name: 'João da Silva',
          email: 'joao@example.com',
          role: UserRole.ATTENDANT,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      listAccessUsersUseCase.execute.mockResolvedValue(users);

      const response = await controller.listAccessUsers(customerId);

      expect(listAccessUsersUseCase.execute).toHaveBeenCalledWith(customerId);
      expect(response).toEqual(CustomerAccessPresenter.toAccessUserListResponse(users));
    });
  });

  describe('listUserCustomers', () => {
    it('should forward to the use case and wrap the result in data', async () => {
      const userId = randomUUID();
      const customers = [
        {
          id: randomUUID(),
          name: 'Oficina Parceira LTDA',
          type: CustomerType.COMPANY,
          isActive: true,
        },
      ];

      listUserCustomersUseCase.execute.mockResolvedValue(customers);

      const response = await controller.listUserCustomers(userId);

      expect(listUserCustomersUseCase.execute).toHaveBeenCalledWith(userId);
      expect(response).toEqual(CustomerAccessPresenter.toLinkedCustomerListResponse(customers));
    });
  });

  describe('revokeAccess', () => {
    it('should forward to the use case', async () => {
      const customerId = randomUUID();
      const userId = randomUUID();
      const actingUserId = randomUUID();

      revokeUseCase.execute.mockResolvedValue(undefined);

      await controller.revokeAccess(customerId, userId, actingUserId);

      expect(revokeUseCase.execute).toHaveBeenCalledWith(customerId, userId, actingUserId);
    });
  });

  describe('updateStatus', () => {
    it('should forward to the use case', async () => {
      const customerId = randomUUID();
      const actingUserId = randomUUID();

      updateStatusUseCase.execute.mockResolvedValue(undefined);

      await controller.updateStatus(customerId, false, actingUserId);

      expect(updateStatusUseCase.execute).toHaveBeenCalledWith(customerId, false, actingUserId);
    });
  });
});
