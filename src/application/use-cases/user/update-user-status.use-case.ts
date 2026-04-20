import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserPublicView } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUpdateUserStatusUseCase } from '@domain/interfaces/use-cases/user/update-user-status.use-case.interface';

export class UpdateUserStatusUseCase implements IUpdateUserStatusUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string, active: boolean): Promise<UserPublicView> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    if (active) {
      user.activate();
    } else {
      user.deactivate();
    }

    const updated = await this.userRepository.update(id, user);

    return updated.toPublicView();
  }
}
