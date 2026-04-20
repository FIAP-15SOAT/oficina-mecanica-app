import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    await this.userRepository.delete(id);
  }
}
