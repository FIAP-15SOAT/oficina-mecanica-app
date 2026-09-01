import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';
import { ListCustomerAccessUsersUseCase } from '@application/use-cases/customer-access/list-customer-access-users.use-case';
import { ListUserCustomersUseCase } from '@application/use-cases/customer-access/list-user-customers.use-case';
import { RevokeCustomerAccessUseCase } from '@application/use-cases/customer-access/revoke-customer-access.use-case';
import { GrantCustomerAccessDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';

import { CustomerAccessPresenter } from './customer-access.presenter';
import {
  CustomerAccessDataResponse,
  AccessUserListResponse,
  LinkedCustomerListResponse,
} from './responses/customer-access.response';

export class CustomerAccessController {
  constructor(
    private readonly grantCustomerAccessUseCase: GrantCustomerAccessUseCase,
    private readonly listCustomerAccessUsersUseCase: ListCustomerAccessUsersUseCase,
    private readonly listUserCustomersUseCase: ListUserCustomersUseCase,
    private readonly revokeCustomerAccessUseCase: RevokeCustomerAccessUseCase,
  ) {}

  async grantAccess(
    customerId: string,
    actingUserId: string,
    input: GrantCustomerAccessDto,
  ): Promise<CustomerAccessDataResponse> {
    const result = await this.grantCustomerAccessUseCase.execute(customerId, actingUserId, input);
    return CustomerAccessPresenter.toDataResponse(result);
  }

  async listAccessUsers(customerId: string): Promise<AccessUserListResponse> {
    const users = await this.listCustomerAccessUsersUseCase.execute(customerId);
    return CustomerAccessPresenter.toAccessUserListResponse(users);
  }

  async listUserCustomers(userId: string): Promise<LinkedCustomerListResponse> {
    const customers = await this.listUserCustomersUseCase.execute(userId);
    return CustomerAccessPresenter.toLinkedCustomerListResponse(customers);
  }

  async revokeAccess(customerId: string, userId: string, actingUserId: string): Promise<void> {
    await this.revokeCustomerAccessUseCase.execute(customerId, userId, actingUserId);
  }
}
