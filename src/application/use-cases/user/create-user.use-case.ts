import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { User, UserPublicView } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@domain/interfaces/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/user.repository.interface';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
}

export type CreateUserOutput = UserPublicView;

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const existing = await this.userRepository.findByEmail(input.email.trim().toLowerCase());

    if (existing) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const passwordHash = await this.hashService.hash(input.password);

    const user = User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    });

    if (input.isActive === false) {
      user.deactivate();
    }

    const created = await this.userRepository.create(user);

    return created.toPublicView();
  }
}
