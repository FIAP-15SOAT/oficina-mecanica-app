import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { CreateCustomerDto } from '@domain/interfaces/use-cases/customer/dto/create-customer.dto';
import { ICreateCustomerUseCase } from '@domain/interfaces/use-cases/customer/create-customer.use-case.interface';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateCustomerUseCase implements ICreateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) { }

  async execute(input: CreateCustomerDto): Promise<Customer> {
    const sanitizedDocument = input.document.replace(/[.\-/]/g, '').trim();
    const sanitizedPhone = input.phone.replace(/\D/g, '').trim();
    const sanitizedZipCode = input.address.zipCode.replace(/\D/g, '').trim();

    const existingByDocument = await this.customerRepository.findByDocument(sanitizedDocument);

    if (existingByDocument) {
      throw new ResourceConflictException(`Documento '${sanitizedDocument}' já está cadastrado.`);
    }

    const existingByEmail = await this.customerRepository.findByEmail(input.email);

    if (existingByEmail) {
      throw new ResourceConflictException(`E-mail '${input.email}' já está cadastrado.`);
    }

    const customer = Customer.create({
      ...input,
      document: sanitizedDocument,
      phone: sanitizedPhone,
      address: {
        ...input.address,
        zipCode: sanitizedZipCode,
      },
    });

    return this.customerRepository.create(customer);
  }
}
