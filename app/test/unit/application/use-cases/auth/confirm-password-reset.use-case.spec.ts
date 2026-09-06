import { ConfirmPasswordResetUseCase } from '@application/use-cases/auth/confirm-password-reset.use-case';
import { User } from '@domain/entities/user.entity';
import { PasswordResetCode } from '@domain/entities/password-reset-code.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { createMockUnitOfWorkWithRepos } from '../../../../helpers/unit-of-work-mock.factory';

describe('ConfirmPasswordResetUseCase', () => {
  function setup() {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'old-hash',
      role: UserRole.ATTENDANT,
    });
    const code = PasswordResetCode.create(user.id, 'hashed-code');
    const { unitOfWork, repos } = createMockUnitOfWorkWithRepos();
    (repos.user.findByEmail as jest.Mock).mockResolvedValue(user);
    (repos.user.update as jest.Mock).mockImplementation((u: User) => Promise.resolve(u));
    (repos.passwordResetCode.findByUserId as jest.Mock).mockResolvedValue(code);
    const hashService = {
      compare: jest.fn(),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    const logger = { event: jest.fn() };

    return { user, code, unitOfWork, repos, hashService, logger };
  }

  it('should update the password and consume the code on a correct match', async () => {
    const { user, unitOfWork, repos, hashService, logger } = setup();
    hashService.compare.mockResolvedValue(true);

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' });

    expect(repos.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'new-hash' }),
    );
    expect(repos.passwordResetCode.delete).toHaveBeenCalledWith(user.id);
  });

  it('should reject with a generic message when the user does not exist', async () => {
    const { unitOfWork, repos, hashService, logger } = setup();
    (repos.user.findByEmail as jest.Mock).mockResolvedValue(null);

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await expect(
      useCase.execute({ email: 'unknown@example.com', code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should reject and atomically increment attempts on a wrong code', async () => {
    const { user, unitOfWork, repos, hashService, logger } = setup();
    hashService.compare.mockResolvedValue(false);

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await expect(
      useCase.execute({ email: user.email.value, code: '000000', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(repos.passwordResetCode.incrementAttempts).toHaveBeenCalledWith(user.id);
    expect(repos.user.update).not.toHaveBeenCalled();
  });

  it('should reject an expired code without comparing it', async () => {
    const { user, unitOfWork, repos, hashService, logger } = setup();
    (repos.passwordResetCode.findByUserId as jest.Mock).mockResolvedValue(
      PasswordResetCode.reconstitute({
        userId: user.id,
        codeHash: 'hashed-code',
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(Date.now() - 11 * 60_000),
      }),
    );

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await expect(
      useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(hashService.compare).not.toHaveBeenCalled();
  });

  it('should reject when no code was ever issued for the user', async () => {
    const { user, unitOfWork, repos, hashService, logger } = setup();
    (repos.passwordResetCode.findByUserId as jest.Mock).mockResolvedValue(null);

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await expect(
      useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should reject an already-exhausted code without comparing it', async () => {
    const { user, unitOfWork, repos, hashService, logger } = setup();
    (repos.passwordResetCode.findByUserId as jest.Mock).mockResolvedValue(
      PasswordResetCode.reconstitute({
        userId: user.id,
        codeHash: 'hashed-code',
        attempts: 5,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      }),
    );

    const useCase = new ConfirmPasswordResetUseCase(unitOfWork, hashService, logger as never);

    await expect(
      useCase.execute({ email: user.email.value, code: '042731', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
    expect(hashService.compare).not.toHaveBeenCalled();
  });
});
