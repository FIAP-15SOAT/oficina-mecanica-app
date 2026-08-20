import { UserRole } from '@domain/enums/user-role.enum';

export interface AuthenticateUserInputDto {
  identifier: string;
  password: string;
}

export interface AuthenticateUserOutputDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}
