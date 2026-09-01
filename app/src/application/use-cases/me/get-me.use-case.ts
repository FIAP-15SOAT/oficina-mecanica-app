import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { GetMeOutputDto } from '@application/ports/input/me/dto/get-me.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class GetMeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userCustomerRepository: IUserCustomerRepository,
  ) {}

  async execute(principal: AuthenticatedPrincipal): Promise<GetMeOutputDto> {
    const user = await this.userRepository.findById(principal.sub);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', principal.sub);
    }

    const customers = await this.userCustomerRepository.findCustomersByUserId(user.id);

    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        type: customer.type,
      })),
    };
  }
}
