import { ConfirmPasswordResetUseCase } from '@application/use-cases/auth/confirm-password-reset.use-case';
import { User } from '@domain/entities/user.entity';
import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

describe('ConfirmPasswordResetUseCase', () => {
  function setup() {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'old-hash',
      role: UserRole.ATTENDANT,
    });
    const code = PasswordResetCode.issue(user.id, 'hashed-code');
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };
    const passwordResetCodeRepository = {
      findByUserId: jest.fn().mockResolvedValue(code),
      update: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      delete: jest.fn(),
    };
    const hashService = {
      compare: jest.fn(),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const logger = { event: jest.fn() };

    return { user, code, userRepository, passwordResetCodeRepository, hashService, logger };
  }

  it('should update the password and consume the code on a correct match', async () => {
    const { user, userRepository, passwordResetCodeRepository, hashService, logger } = setup();
    hashService.compare.mockResolvedValue(true);

    const useCase = new ConfirmPasswordResetUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService,
      logger as never,
    );

    await useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' });

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'new-hash' }),
    );
    expect(passwordResetCodeRepository.delete).toHaveBeenCalledWith(user.id);
  });

  it('should reject with a generic message when the user does not exist', async () => {
    const { passwordResetCodeRepository, hashService, logger } = setup();
    const userRepository = { findByEmail: jest.fn().mockResolvedValue(null), update: jest.fn() };

    const useCase = new ConfirmPasswordResetUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService,
      logger as never,
    );

    await expect(
      useCase.execute({ email: 'unknown@example.com', code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should reject and increment attempts on a wrong code', async () => {
    const { user, userRepository, passwordResetCodeRepository, hashService, logger } = setup();
    hashService.compare.mockResolvedValue(false);

    const useCase = new ConfirmPasswordResetUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService,
      logger as never,
    );

    await expect(
      useCase.execute({ email: user.email.value, code: '000000', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(passwordResetCodeRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('should reject an expired code without comparing it', async () => {
    const { user, userRepository, passwordResetCodeRepository, hashService, logger } = setup();
    passwordResetCodeRepository.findByUserId.mockResolvedValue(
      PasswordResetCode.reconstitute({
        userId: user.id,
        codeHash: 'hashed-code',
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 11 * 60_000),
      }),
    );

    const useCase = new ConfirmPasswordResetUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService,
      logger as never,
    );

    await expect(
      useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(hashService.compare).not.toHaveBeenCalled();
  });

  it('should reject when no code was ever issued for the user', async () => {
    const { user, userRepository, passwordResetCodeRepository, hashService, logger } = setup();
    passwordResetCodeRepository.findByUserId.mockResolvedValue(null);

    const useCase = new ConfirmPasswordResetUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService,
      logger as never,
    );

    await expect(
      useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });
});
