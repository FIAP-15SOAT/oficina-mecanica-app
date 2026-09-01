import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';
import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateCustomerStatusUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(customerId: string, isActive: boolean, actingUserId: string): Promise<void> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    if (isActive) {
      customer.activate();
    } else {
      customer.deactivate();
    }

    const updated = await this.customerRepository.update(customer);

    this.logger.event(BUSINESS_EVENTS.CUSTOMER_STATUS_UPDATED, {
      subjectId: actingUserId,
      customerId: updated.id,
      customerActive: updated.isActive,
    });
  }
}
