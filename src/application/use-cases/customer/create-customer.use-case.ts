import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { CreateCustomerDto } from '@domain/interfaces/use-cases/customer/dto/create-customer.dto';
import { ICreateCustomerUseCase } from '@domain/interfaces/use-cases/customer/create-customer.use-case.interface';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(input: CreateCustomerDto): Promise<Customer> {
    const byDocument = await this.customerRepository.findByDocument(input.document);
    if (byDocument) {
      throw new ResourceConflictException(`Documento '${input.document}' já está cadastrado.`);
    }
    const byEmail = await this.customerRepository.findByEmail(input.email);
    if (byEmail) {
      throw new ResourceConflictException(`E-mail '${input.email}' já está cadastrado.`);
    }
    const customer = Customer.create(input);
    return this.customerRepository.create(customer);
  }
}
