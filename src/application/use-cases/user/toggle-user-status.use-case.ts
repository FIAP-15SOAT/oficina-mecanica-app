import { ResourceNotFoundException } from '../../exceptions';
import { UserPublicView } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/interfaces';

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
