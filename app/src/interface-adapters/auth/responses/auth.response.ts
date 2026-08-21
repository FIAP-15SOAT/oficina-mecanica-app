import { UserRole } from '@domain/enums/user-role.enum';

export interface AuthUserSummaryResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummaryResponse;
}

export interface AuthDataResponse {
  data: AuthResponse;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeDataResponse {
  data: MeResponse;
}
