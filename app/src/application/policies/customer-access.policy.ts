import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

/**
 * A verificação de vínculo não fica só no guard HTTP (spec §13): esta política
 * é reutilizável por qualquer adaptador que acione os use cases externos.
 * Nunca lança 403 — recurso inexistente e recurso não autorizado respondem
 * igualmente 404, para não transformar a rota em oráculo de enumeração.
 */
export class CustomerAccessPolicy {
  constructor(private readonly userCustomerRepository: IUserCustomerRepository) {}

  async getAuthorizedCustomerIds(userId: string): Promise<string[]> {
    return this.userCustomerRepository.findActiveCustomerIdsByUserId(userId);
  }

  async assertCustomerAuthorized(userId: string, customerId: string): Promise<void> {
    const authorizedIds = await this.getAuthorizedCustomerIds(userId);

    if (!authorizedIds.includes(customerId)) {
      throw new ResourceNotFoundException('Recurso');
    }
  }
}
