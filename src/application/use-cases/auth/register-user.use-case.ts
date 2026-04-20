import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { User } from '@domain/entities/user.entity';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  RegisterUserInputDto,
  RegisterUserOutputDto,
} from '@domain/interfaces/use-cases/auth/dto/register-user.dto';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(input: RegisterUserInputDto): Promise<RegisterUserOutputDto> {
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
