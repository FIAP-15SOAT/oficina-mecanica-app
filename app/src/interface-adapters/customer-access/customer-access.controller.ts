import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';
import { GrantCustomerAccessDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';
import { CustomerAccessPresenter } from './customer-access.presenter';
import { CustomerAccessDataResponse } from './responses/customer-access.response';

export class CustomerAccessController {
  constructor(private readonly grantCustomerAccessUseCase: GrantCustomerAccessUseCase) {}

  async grantAccess(
    customerId: string,
    actingUserId: string,
    input: GrantCustomerAccessDto,
  ): Promise<CustomerAccessDataResponse> {
    const result = await this.grantCustomerAccessUseCase.execute(customerId, actingUserId, input);
    return CustomerAccessPresenter.toDataResponse(result);
  }
}
