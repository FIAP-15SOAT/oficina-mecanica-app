import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserPublicView } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/user.repository.interface';

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
