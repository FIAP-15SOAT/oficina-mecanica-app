import { ResourceConflictException } from '../../exceptions';
import { User, UserPublicView } from '../../../domain/entities';
import { UserRole } from '../../../domain/enums';
import { IHashService, IUserRepository } from '../../../domain/interfaces';

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
