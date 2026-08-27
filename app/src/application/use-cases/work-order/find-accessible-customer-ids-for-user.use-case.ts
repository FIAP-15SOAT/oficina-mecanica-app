import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';
import { IFindAccessibleCustomerIdsForUserUseCase } from '@application/ports/input/work-order/find-accessible-customer-ids-for-user.use-case.interface';

export class FindAccessibleCustomerIdsForUserUseCase implements IFindAccessibleCustomerIdsForUserUseCase {
  constructor(private readonly accessRepository: IUserCustomerAccessRepository) {}

  async execute(userId: string): Promise<string[]> {
    const links = await this.accessRepository.findByUserId(userId);
    return links.map((link) => link.customerId);
  }
}
