import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { User, UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@domain/interfaces/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/user.repository.interface';

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export type RegisterUserOutput = Omit<UserPublicView, 'updatedAt'>;

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existingUser = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

    if (existingUser) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const passwordHash = await this.hashService.hash(input.password);

    const user = User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    const created = await this.userRepository.create(user);

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
      createdAt: created.createdAt,
    };
  }
}
