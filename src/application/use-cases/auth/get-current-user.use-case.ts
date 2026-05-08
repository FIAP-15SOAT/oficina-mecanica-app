import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { GetCurrentUserOutputDto } from '@domain/interfaces/use-cases/auth/dto/get-current-user.dto';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserOutputDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
