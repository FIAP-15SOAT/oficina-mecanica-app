import { Customer } from '@domain/entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';

export interface ICreateCustomerUseCase {
  execute(input: CreateCustomerDto, actingUserId: string): Promise<Customer>;
}
