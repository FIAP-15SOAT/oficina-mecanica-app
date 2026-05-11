import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@domain/interfaces/use-cases/user/dto/update-user.dto';
import { Email } from '@domain/value-objects/email.vo';

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
      const passwordHash = await this.hashService.hash(updateUserDto.password);
      user.changePassword(passwordHash);
    }

    const updated = await this.userRepository.update(user);

    return updated.toPublicView();
  }
}
