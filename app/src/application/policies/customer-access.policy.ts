import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

/**
 * A verificação de vínculo não fica só no guard HTTP: esta política
 * é reutilizável por qualquer adaptador que acione os use cases externos.
 * Nunca lança 403 — recurso inexistente e recurso não autorizado respondem
 * igualmente 404, para não transformar a rota em oráculo de enumeração.
 */
export class CustomerAccessPolicy {
  constructor(
    private readonly userCustomerRepository: IUserCustomerRepository,
    private readonly logger: ILogger,
  ) {}

  async getAuthorizedCustomerIds(userId: string): Promise<string[]> {
    return this.userCustomerRepository.findActiveCustomerIdsByUserId(userId);
  }

  async assertCustomerAuthorized(userId: string, customerId: string): Promise<void> {
    const authorized = await this.userCustomerRepository.existsActiveLink(userId, customerId);

    if (!authorized) {
      this.logger.event(BUSINESS_EVENTS.CUSTOMER_ACCESS_DENIED, {
        subjectId: userId,
        customerId,
        externalAccessFailureReason: 'no_active_link',
      });

      throw new ResourceNotFoundException('Recurso');
    }
  }
}
