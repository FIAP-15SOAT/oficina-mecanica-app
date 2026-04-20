import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export type UpdateUserOutput = UserPublicView;

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<UpdateUserOutput> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    if (input.email !== undefined) {
      const normalizedEmail = input.email.trim().toLowerCase();

      if (normalizedEmail !== user.email) {
        const existing = await this.userRepository.findByEmail(normalizedEmail);

        if (existing) {
          throw new ResourceConflictException('E-mail já cadastrado no sistema');
        }
      }

      user.changeEmail(input.email);
    }

    if (input.name !== undefined) {
      user.changeName(input.name);
    }

    if (input.role !== undefined) {
      user.changeRole(input.role);
    }

    if (input.password !== undefined) {
      const passwordHash = await this.hashService.hash(input.password);
      user.changePassword(passwordHash);
    }

    const updated = await this.userRepository.update(id, user);

    return updated.toPublicView();
  }
}
