import { User } from '@domain/entities/user.entity';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  CreateUserDto,
  CreateUserOutputDto,
} from '@application/ports/input/user/dto/create-user.dto';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

export class CreateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(createUserDto: CreateUserDto): Promise<CreateUserOutputDto> {
    User.validatePasswordStrength(createUserDto.password);

    const existing = await this.userRepository.findByEmail(
      createUserDto.email.trim().toLowerCase(),
    );

    if (existing) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const passwordHash = await this.hashService.hash(createUserDto.password);

    const user = User.create({
      name: createUserDto.name,
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
    });

    const created = await this.userRepository.create(user);

    return created.toPublicView();
  }
}
