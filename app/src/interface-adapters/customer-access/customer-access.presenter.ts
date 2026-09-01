import { UserPublicView } from '@domain/entities/user.entity';
import { GrantCustomerAccessOutputDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';
import { LinkedCustomerOutputDto } from '@application/use-cases/customer-access/list-user-customers.use-case';
import {
  AccessUserListResponse,
  CustomerAccessDataResponse,
  LinkedCustomerListResponse,
} from './responses/customer-access.response';

export class CustomerAccessPresenter {
  static toDataResponse(result: GrantCustomerAccessOutputDto): CustomerAccessDataResponse {
    return { data: result };
  }

  static toAccessUserListResponse(users: UserPublicView[]): AccessUserListResponse {
    return { data: users };
  }

  static toLinkedCustomerListResponse(
    customers: LinkedCustomerOutputDto[],
  ): LinkedCustomerListResponse {
    return { data: customers };
  }
}
