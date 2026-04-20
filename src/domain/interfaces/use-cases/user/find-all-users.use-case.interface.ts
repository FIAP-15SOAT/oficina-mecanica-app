import { UserPublicView } from '@domain/entities/user.entity';

export interface IFindAllUsersUseCase {
  execute(): Promise<UserPublicView[]>;
}
