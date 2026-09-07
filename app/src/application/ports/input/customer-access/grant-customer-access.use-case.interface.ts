import {
  GrantCustomerAccessDto,
  GrantCustomerAccessOutputDto,
} from './dto/grant-customer-access.dto';

export interface IGrantCustomerAccessUseCase {
  execute(
    customerId: string,
    actingUserId: string,
    input?: GrantCustomerAccessDto,
  ): Promise<GrantCustomerAccessOutputDto>;
}
