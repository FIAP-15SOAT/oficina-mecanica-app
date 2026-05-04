import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { Address } from '@domain/entities/address.entity';
import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { UpdateCustomerDto } from '@domain/interfaces/use-cases/customer/dto/update-customer.dto';
import { IUpdateCustomerUseCase } from '@domain/interfaces/use-cases/customer/update-customer.use-case.interface';

export class UpdateCustomerUseCase implements IUpdateCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string, input: UpdateCustomerDto): Promise<Customer> {
    const sanitizedDocument = input.document.replace(/[.\-/]/g, '').trim();
    const sanitizedPhone = input.phone.replace(/\D/g, '').trim();
    const sanitizedZipCode = input.address.zipCode.replace(/\D/g, '').trim();

    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Cliente', id);
    }

    if (sanitizedDocument !== existing.document) {
      const existingByDocument = await this.customerRepository.findByDocument(sanitizedDocument);

      if (existingByDocument) {
        throw new ResourceConflictException(`Documento '${sanitizedDocument}' já está cadastrado.`);
      }
    }

    if (input.email !== existing.email) {
      const existingByEmail = await this.customerRepository.findByEmail(input.email);

      if (existingByEmail) {
        throw new ResourceConflictException(`E-mail '${input.email}' já está cadastrado.`);
      }
    }

    const updateData: Partial<Customer> = {
      name: input.name,
      document: sanitizedDocument,
      type: input.type,
      email: input.email,
      phone: sanitizedPhone,
      address: Address.create({
        customerId: id,
        ...input.address,
        zipCode: sanitizedZipCode,
      }),
    };
    return this.customerRepository.update(id, updateData);
  }
}
