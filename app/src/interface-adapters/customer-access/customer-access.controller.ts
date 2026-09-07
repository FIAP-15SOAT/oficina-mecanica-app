import { IGrantCustomerAccessUseCase } from '@application/ports/input/customer-access/grant-customer-access.use-case.interface';
import { IListCustomerAccessUsersUseCase } from '@application/ports/input/customer-access/list-customer-access-users.use-case.interface';
import { IListUserCustomersUseCase } from '@application/ports/input/customer-access/list-user-customers.use-case.interface';
import { IRevokeCustomerAccessUseCase } from '@application/ports/input/customer-access/revoke-customer-access.use-case.interface';
import { IUpdateCustomerStatusUseCase } from '@application/ports/input/customer-access/update-customer-status.use-case.interface';
import { GrantCustomerAccessDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';

import { CustomerAccessPresenter } from './customer-access.presenter';
import {
  CustomerAccessDataResponse,
  AccessUserListResponse,
  LinkedCustomerListResponse,
} from './responses/customer-access.response';

export class CustomerAccessController {
  constructor(
    private readonly grantCustomerAccessUseCase: IGrantCustomerAccessUseCase,
    private readonly listCustomerAccessUsersUseCase: IListCustomerAccessUsersUseCase,
    private readonly listUserCustomersUseCase: IListUserCustomersUseCase,
    private readonly revokeCustomerAccessUseCase: IRevokeCustomerAccessUseCase,
    private readonly updateCustomerStatusUseCase: IUpdateCustomerStatusUseCase,
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

  async updateStatus(customerId: string, isActive: boolean, actingUserId: string): Promise<void> {
    await this.updateCustomerStatusUseCase.execute(customerId, isActive, actingUserId);
  }
}
