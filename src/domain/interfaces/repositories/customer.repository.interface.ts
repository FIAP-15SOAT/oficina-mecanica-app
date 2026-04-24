import { Customer } from '@domain/entities/customer.entity';
import { CustomerType } from '@domain/enums/customer-type.enum';

export interface CustomerFilters {
  page: number;
  limit: number;
  name?: string;
  type?: CustomerType;
  document?: string;
}

export interface ICustomerRepository {
  create(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findAll(filters: CustomerFilters): Promise<{ items: Customer[]; total: number }>;
  update(id: string, data: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<void>;
  hasVehicles(id: string): Promise<boolean>;
  hasWorkOrders(id: string): Promise<boolean>;
}
