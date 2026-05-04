import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IDeleteCustomerUseCase } from '@domain/interfaces/use-cases/customer/delete-customer.use-case.interface';

export class DeleteCustomerUseCase implements IDeleteCustomerUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.customerRepository.findById(id);

    if (!existing) {
      throw new ResourceNotFoundException('Cliente', id);
    }

    const [hasVehicles, hasWorkOrders] = await Promise.all([
      this.customerRepository.hasVehicles(id),
      this.customerRepository.hasWorkOrders(id),
    ]);

    if (hasVehicles || hasWorkOrders) {
      throw new ResourceConflictException(
        'Cliente possui veículos cadastrados ou o rdens de serviço e não pode ser excluído.',
      );
    }

    await this.customerRepository.delete(id);
  }
}
