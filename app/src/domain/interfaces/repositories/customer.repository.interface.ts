import { Customer } from '@domain/entities/customer.entity';
import { PersonType } from '@domain/enums/person-type.enum';
import { PaginatedRepositoryResult, PaginationInput } from '../common/pagination.interface';

export interface CustomerFilters {
  name?: string;
  type?: PersonType;
  document?: string;
}

export interface ICustomerRepository {
  create(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findAllPaginated(
    pagination: PaginationInput,
    filters: CustomerFilters,
  ): Promise<PaginatedRepositoryResult<Customer>>;
  update(customer: Customer): Promise<Customer>;
  delete(id: string): Promise<void>;
  isCustomerInUse(id: string): Promise<boolean>;
}
