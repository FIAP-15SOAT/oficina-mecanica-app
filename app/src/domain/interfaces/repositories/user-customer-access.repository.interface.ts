import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';

export interface IUserCustomerAccessRepository {
  create(access: UserCustomerAccess): Promise<UserCustomerAccess>;
  findByUserId(userId: string): Promise<UserCustomerAccess[]>;
}
