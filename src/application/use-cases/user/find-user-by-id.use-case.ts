import { ResourceNotFoundException } from '../../exceptions';
import { UserPublicView } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/interfaces';

export type FindUserByIdOutput = UserPublicView;

export class FindUserByIdUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(id: string): Promise<FindUserByIdOutput> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    return user.toPublicView();
  }
}
