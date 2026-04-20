import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserPublicView } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export type ToggleUserStatusOutput = UserPublicView;

export class ToggleUserStatusUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async activate(id: string): Promise<ToggleUserStatusOutput> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    user.activate();

    const updated = await this.userRepository.update(id, user);

    return updated.toPublicView();
  }

  async deactivate(id: string): Promise<ToggleUserStatusOutput> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    user.deactivate();

    const updated = await this.userRepository.update(id, user);

    return updated.toPublicView();
  }
}
