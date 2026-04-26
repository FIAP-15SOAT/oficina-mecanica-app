import { Customer } from '@domain/entities/customer.entity';

export interface IFindCustomerByIdUseCase {
  execute(id: string): Promise<Customer>;
}
