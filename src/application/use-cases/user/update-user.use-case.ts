import { User } from '@domain/entities/user.entity';
import { Email } from '@domain/value-objects/email.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@application/ports/input/user/dto/update-user.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(id: string, updateUserDto: UpdateUserDto): Promise<UpdateUserOutputDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', id);
    }

    if (updateUserDto.email !== undefined) {
      const newEmail = Email.create(updateUserDto.email);

      if (!newEmail.equals(user.email)) {
        const existing = await this.userRepository.findByEmail(newEmail.value);

        if (existing) {
          throw new ResourceConflictException('E-mail já cadastrado no sistema');
        }
      }

      user.changeEmail(updateUserDto.email);
    }

    if (updateUserDto.name !== undefined) {
      user.changeName(updateUserDto.name);
    }

    if (updateUserDto.role !== undefined) {
      user.changeRole(updateUserDto.role);
    }

    if (updateUserDto.password !== undefined) {
      User.validatePasswordStrength(updateUserDto.password);

      const passwordHash = await this.hashService.hash(updateUserDto.password);

      user.changePassword(passwordHash);
    }

    const updated = await this.userRepository.update(user);

    return updated.toPublicView();
  }
}
