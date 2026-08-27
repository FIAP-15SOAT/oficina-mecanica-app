import { User } from '@domain/entities/user.entity';
import { Document } from '@domain/value-objects/document.vo';

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

    const existingEmail = await this.userRepository.findByEmail(
      createUserDto.email.trim().toLowerCase(),
    );

    if (existingEmail) {
      throw new ResourceConflictException('E-mail já cadastrado no sistema');
    }

    const existingDocument = await this.userRepository.findByDocument(
      Document.sanitize(createUserDto.document),
    );

    if (existingDocument) {
      throw new ResourceConflictException('Documento já cadastrado no sistema');
    }

    const passwordHash = await this.hashService.hash(createUserDto.password);

    const user = User.create({
      name: createUserDto.name,
      email: createUserDto.email,
      document: createUserDto.document,
      passwordHash,
      role: createUserDto.role,
    });

    const created = await this.userRepository.create(user);

    return created.toPublicView();
  }
}
