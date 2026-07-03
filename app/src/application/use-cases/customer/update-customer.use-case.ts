import { Customer } from '@domain/entities/customer.entity';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUpdateCustomerUseCase } from '@application/ports/input/customer/update-customer.use-case.interface';
import { UpdateCustomerDto } from '@application/ports/input/customer/dto/update-customer.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateCustomerUseCase implements IUpdateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string, input: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Cliente', id);
    }

    const newDocument = Document.create(input.document, input.type);

    if (!newDocument.equals(existing.document)) {
      const existingByDocument = await this.customerRepository.findByDocument(newDocument.value);

      if (existingByDocument) {
        throw new ResourceConflictException(`Documento '${newDocument.value}' já está cadastrado.`);
      }
    }

    const newEmail = Email.create(input.email);

    if (!newEmail.equals(existing.email)) {
      const existingByEmail = await this.customerRepository.findByEmail(newEmail.value);

      if (existingByEmail) {
        throw new ResourceConflictException(`E-mail '${newEmail.value}' já está cadastrado.`);
      }
    }

    existing.update(input);

    return this.customerRepository.update(existing);
  }
}
