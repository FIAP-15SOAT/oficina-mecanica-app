import { Customer } from '../entities/customer.entity';

export interface ICustomerRepository {
  create(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByDocument(document: string): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
  update(id: string, data: Partial<Customer>): Promise<Customer>;
  delete(id: string): Promise<void>;
}
