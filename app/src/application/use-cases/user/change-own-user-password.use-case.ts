import { User } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ChangeOwnPasswordDto } from '@application/ports/input/user/dto/change-own-password.dto';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class ChangeOwnUserPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
  ) {}

  async execute(userId: string, input: ChangeOwnPasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('Usuário', userId);
    }

    const currentPasswordMatches = await this.hashService.compare(
      input.currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedAccessException('Senha atual incorreta');
    }

    User.validatePasswordStrength(input.newPassword);

    const newPasswordHash = await this.hashService.hash(input.newPassword);
    user.changePassword(newPasswordHash);

    await this.userRepository.update(user);
  }
}
