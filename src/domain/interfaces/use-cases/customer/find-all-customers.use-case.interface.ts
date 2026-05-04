import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { Customer } from '@domain/entities/customer.entity';
import { FindAllCustomersInputDto } from './dto/find-all-customers.dto';

export interface IFindAllCustomersUseCase {
  execute(input: FindAllCustomersInputDto): Promise<PaginatedResult<Customer>>;
}
