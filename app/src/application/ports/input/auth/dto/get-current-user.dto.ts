import { UserRole } from '@domain/enums/user-role.enum';

export interface GetCurrentUserOutputDto {
  id: string;
  name: string;
  email: string;
  role: UserRole | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
