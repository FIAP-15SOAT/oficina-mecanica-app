import { User } from '@domain/entities/user.entity';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IPasswordResetCodeRepository } from '@domain/interfaces/repositories/password-reset-code.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';

import { BUSINESS_EVENTS } from '@application/logging/business-event.catalog';
import { ConfirmPasswordResetDto } from '@application/ports/input/auth/dto/confirm-password-reset.dto';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

const GENERIC_MESSAGE = 'Código de redefinição inválido ou expirado';

export class ConfirmPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetCodeRepository: IPasswordResetCodeRepository,
    private readonly hashService: IHashService,
    private readonly logger: ILogger,
  ) {}

  async execute(dto: ConfirmPasswordResetDto): Promise<void> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      this.reject('unknown_user');
    }

    const code = await this.passwordResetCodeRepository.findByUserId(user.id);

    if (!code) {
      this.reject('no_code_issued');
    }

    if (code.isExpired()) {
      this.reject('expired');
    }

    if (code.isExhausted()) {
      this.reject('exhausted');
    }

    const matches = await this.hashService.compare(dto.code, code.codeHash);

    if (!matches) {
      code.registerFailedAttempt();
      await this.passwordResetCodeRepository.update(code);
      this.reject('wrong_code');
    }

    User.validatePasswordStrength(dto.newPassword);

    const newHash = await this.hashService.hash(dto.newPassword);
    user.changePassword(newHash);

    await this.userRepository.update(user);
    await this.passwordResetCodeRepository.delete(user.id);

    this.logger.event(BUSINESS_EVENTS.USER_PASSWORD_RESET_COMPLETED, {
      targetUserId: user.id,
      resetOutcome: 'confirmed',
    });
  }

  private reject(reason: string): never {
    this.logger.event(BUSINESS_EVENTS.USER_PASSWORD_RESET_REJECTED, {
      resetOutcome: reason,
    });

    throw new UnauthorizedAccessException(GENERIC_MESSAGE);
  }
}
