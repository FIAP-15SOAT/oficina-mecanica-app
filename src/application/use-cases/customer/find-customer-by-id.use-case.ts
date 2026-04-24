import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IFindCustomerByIdUseCase } from '@domain/interfaces/use-cases/customer/find-customer-by-id.use-case.interface';

export class FindCustomerByIdUseCase implements IFindCustomerByIdUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new ResourceNotFoundException('Cliente', id);
    }
    return customer;
  }
}
