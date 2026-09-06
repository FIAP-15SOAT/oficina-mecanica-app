import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { LinkedCustomerOutputDto } from '@application/ports/input/customer-access/dto/list-user-customers.dto';
import { IListUserCustomersUseCase } from '@application/ports/input/customer-access/list-user-customers.use-case.interface';

export class ListUserCustomersUseCase implements IListUserCustomersUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userCustomerRepository: IUserCustomerRepository,
  ) {}

  async execute(userId: string): Promise<LinkedCustomerOutputDto[]> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    const customers = await this.userCustomerRepository.findCustomersByUserId(userId);

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      type: customer.type,
      isActive: customer.isActive,
    }));
  }
}
