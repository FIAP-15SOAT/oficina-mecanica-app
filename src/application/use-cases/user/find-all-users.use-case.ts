import { UserPublicView } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/interfaces';

export type FindAllUsersOutput = UserPublicView[];

export class FindAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<FindAllUsersOutput> {
    const users = await this.userRepository.findAll();

    return users.map((user) => user.toPublicView());
  }
}
