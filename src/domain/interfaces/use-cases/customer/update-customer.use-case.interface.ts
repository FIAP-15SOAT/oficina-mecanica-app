import { Customer } from '@domain/entities/customer.entity';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface IUpdateCustomerUseCase {
  execute(id: string, input: UpdateCustomerDto): Promise<Customer>;
}
