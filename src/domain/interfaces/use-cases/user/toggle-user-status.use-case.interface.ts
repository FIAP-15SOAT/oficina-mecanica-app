import { UserPublicView } from '@domain/entities/user.entity';

export interface IToggleUserStatusUseCase {
  activate(id: string): Promise<UserPublicView>;
  deactivate(id: string): Promise<UserPublicView>;
}
