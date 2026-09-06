import { UserPublicView } from '@domain/entities/user.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IListCustomerAccessUsersUseCase } from '@application/ports/input/customer-access/list-customer-access-users.use-case.interface';

export class ListCustomerAccessUsersUseCase implements IListCustomerAccessUsersUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly userCustomerRepository: IUserCustomerRepository,
  ) {}

  async execute(customerId: string): Promise<UserPublicView[]> {
    const customer = await this.customerRepository.findById(customerId);

    if (!customer) {
      throw new ResourceNotFoundException('Cliente', customerId);
    }

    const users = await this.userCustomerRepository.findUsersByCustomerId(customerId);

    return users.map((user) => user.toPublicView());
  }
}
