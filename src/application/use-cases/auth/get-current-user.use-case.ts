import { ResourceNotFoundException } from '../../exceptions';
import { UserRole } from '../../../domain/enums';
import { IUserRepository } from '../../../domain/interfaces';

export interface GetCurrentUserOutput {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserOutput> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
