// src/application/use-cases/customer/update-customer.use-case.ts
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { UpdateCustomerDto } from '@domain/interfaces/use-cases/customer/dto/update-customer.dto';
import { IUpdateCustomerUseCase } from '@domain/interfaces/use-cases/customer/update-customer.use-case.interface';

export class UpdateCustomerUseCase implements IUpdateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string, input: UpdateCustomerDto): Promise<Customer> {
    const existing = await this.customerRepository.findById(id);
    if (!existing) {
      throw new ResourceNotFoundException('Cliente', id);
    }
    if (input.document && input.document !== existing.document) {
      const byDocument = await this.customerRepository.findByDocument(input.document);
      if (byDocument) {
        throw new ResourceConflictException(`Documento '${input.document}' já está cadastrado.`);
      }
    }
    if (input.email && input.email !== existing.email) {
      const byEmail = await this.customerRepository.findByEmail(input.email);
      if (byEmail) {
        throw new ResourceConflictException(`E-mail '${input.email}' já está cadastrado.`);
      }
    }
    return this.customerRepository.update(id, input);
  }
}
