import { UserRole } from '@domain/enums/user-role.enum';
import { PaginationMeta } from '@domain/interfaces/common/pagination.interface';

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  document: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDataResponse {
  data: UserResponse;
}

export interface UserPaginatedResponse {
  data: UserResponse[];
  pagination: PaginationMeta;
}
