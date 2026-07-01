import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { CreateCustomerDto } from '@application/ports/input/customer/dto/create-customer.dto';
import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(input: CreateCustomerDto): Promise<Customer> {
    const document = Document.create(input.document, input.type);
    const email = Email.create(input.email);

    const existingByDocument = await this.customerRepository.findByDocument(document.value);

    if (existingByDocument) {
      throw new ResourceConflictException(`Documento '${document.value}' já está cadastrado.`);
    }

    const existingByEmail = await this.customerRepository.findByEmail(email.value);

    if (existingByEmail) {
      throw new ResourceConflictException(`E-mail '${email.value}' já está cadastrado.`);
    }

    const customer = Customer.create(input);

    return this.customerRepository.create(customer);
  }
}
