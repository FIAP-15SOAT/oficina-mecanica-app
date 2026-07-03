import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IDeleteCustomerUseCase } from '@application/ports/input/customer/delete-customer.use-case.interface';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class DeleteCustomerUseCase implements IDeleteCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Cliente', id);
    }

    const inUse = await this.customerRepository.isCustomerInUse(id);

    if (inUse) {
      throw new ResourceConflictException(
        'Cliente possui veículos cadastrados ou ordens de serviço e não pode ser excluído.',
      );
    }

    await this.customerRepository.delete(id);
  }
}
