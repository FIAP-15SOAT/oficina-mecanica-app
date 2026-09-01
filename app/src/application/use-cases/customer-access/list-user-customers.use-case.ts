import { CustomerType } from '@domain/enums/customer-type.enum';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export interface LinkedCustomerOutputDto {
  id: string;
  name: string;
  type: CustomerType;
  isActive: boolean;
}

export class ListUserCustomersUseCase {
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
