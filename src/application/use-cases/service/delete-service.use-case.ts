import { IServiceRepository } from '@domain/interfaces/repositories/service.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class DeleteServiceUseCase {
  constructor(private readonly serviceRepository: IServiceRepository) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);

    if (!service) {
      throw new ResourceNotFoundException('Serviço', id);
    }

    const [hasWorkOrders, hasQuotes] = await Promise.all([
      this.serviceRepository.hasWorkOrderServices(id),
      this.serviceRepository.hasQuoteServices(id),
    ]);

    if (hasWorkOrders || hasQuotes) {
      throw new ResourceConflictException(
        'Serviço não pode ser excluído pois está vinculado a ordens de serviço ou orçamentos.',
      );
    }

    await this.serviceRepository.delete(id);
  }
}
