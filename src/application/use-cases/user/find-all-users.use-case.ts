import { UserPublicView } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/user.repository.interface';

export type FindAllUsersOutput = UserPublicView[];

export class FindAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<FindAllUsersOutput> {
    const users = await this.userRepository.findAll();

    return users.map((user) => user.toPublicView());
  }
}
