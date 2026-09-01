import { UserCustomer } from '@domain/entities/user-customer.entity';
import { User } from '@domain/entities/user.entity';
import { Customer } from '@domain/entities/customer.entity';

export interface IUserCustomerRepository {
  create(link: UserCustomer): Promise<UserCustomer>;
  exists(userId: string, customerId: string): Promise<boolean>;
  delete(userId: string, customerId: string): Promise<void>;
  findUsersByCustomerId(customerId: string): Promise<User[]>;
  findCustomersByUserId(userId: string): Promise<Customer[]>;
  findActiveCustomerIdsByUserId(userId: string): Promise<string[]>;
}
