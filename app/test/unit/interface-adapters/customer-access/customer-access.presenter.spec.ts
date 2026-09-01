import { randomUUID } from 'node:crypto';

import { CustomerAccessPresenter } from '@interface-adapters/customer-access/customer-access.presenter';
import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { GrantCustomerAccessOutputDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';
import { LinkedCustomerOutputDto } from '@application/use-cases/customer-access/list-user-customers.use-case';

describe('CustomerAccessPresenter', () => {
  describe('toDataResponse', () => {
    it('should wrap the grant result in a data property', () => {
      const result: GrantCustomerAccessOutputDto = {
        userId: randomUUID(),
        customerId: randomUUID(),
        initialPasswordSent: true,
      };

      expect(CustomerAccessPresenter.toDataResponse(result)).toEqual({ data: result });
    });
  });

  describe('toAccessUserListResponse', () => {
    it('should wrap the users in a data property', () => {
      const users: UserPublicView[] = [
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

      expect(CustomerAccessPresenter.toAccessUserListResponse(users)).toEqual({ data: users });
    });
  });

  describe('toLinkedCustomerListResponse', () => {
    it('should wrap the customers in a data property', () => {
      const customers: LinkedCustomerOutputDto[] = [
        {
          id: randomUUID(),
          name: 'Oficina Parceira LTDA',
          type: CustomerType.COMPANY,
          isActive: true,
        },
      ];

      expect(CustomerAccessPresenter.toLinkedCustomerListResponse(customers)).toEqual({
        data: customers,
      });
    });
  });
});
