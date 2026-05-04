import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export type CreateUserOutputDto = UserPublicView;
