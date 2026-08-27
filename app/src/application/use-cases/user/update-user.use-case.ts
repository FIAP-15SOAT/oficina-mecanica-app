import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@application/ports/input/user/dto/update-user.dto';

import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

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

    if (updateUserDto.document !== undefined) {
      const newDocument = Document.create(updateUserDto.document);

      if (!newDocument.equals(user.document)) {
        const existing = await this.userRepository.findByDocument(newDocument.value);

        if (existing) {
          throw new ResourceConflictException('Documento já cadastrado no sistema');
        }
      }

      user.changeDocument(updateUserDto.document);
    }

    if (updateUserDto.name !== undefined) {
      user.changeName(updateUserDto.name);
    }

    if (updateUserDto.role !== undefined) {
      user.changeRole(updateUserDto.role);
    }

    const updated = await this.userRepository.update(user);

    return updated.toPublicView();
  }
}
