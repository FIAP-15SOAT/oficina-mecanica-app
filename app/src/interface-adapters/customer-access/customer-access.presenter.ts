import { UserPublicView } from '@domain/entities/user.entity';
import { GrantCustomerAccessOutputDto } from '@application/ports/input/customer-access/dto/grant-customer-access.dto';
import { LinkedCustomerOutputDto } from '@application/ports/input/customer-access/dto/list-user-customers.dto';
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
