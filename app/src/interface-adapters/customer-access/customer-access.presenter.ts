import { GrantCustomerAccessOutputDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';
import { CustomerAccessDataResponse } from './responses/customer-access.response';

export class CustomerAccessPresenter {
  static toDataResponse(result: GrantCustomerAccessOutputDto): CustomerAccessDataResponse {
    return { data: result };
  }
}
