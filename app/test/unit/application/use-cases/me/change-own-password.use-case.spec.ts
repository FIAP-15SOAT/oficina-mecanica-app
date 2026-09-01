import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { BusinessRuleViolationException } from '@domain/exceptions/business-rule-violation.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('ChangeOwnPasswordUseCase', () => {
  function buildUser(): User {
    return User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'current-hash',
      role: UserRole.ATTENDANT,
    });
  }

  it('should change the password when the current one matches', async () => {
    const user = buildUser();
    const userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };
    const hashService = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };

    const useCase = new ChangeOwnPasswordUseCase(userRepository as never, hashService);

    await useCase.execute(user.id, {
      currentPassword: 'CurrentPass@123',
      newPassword: 'NewPass@456',
    });

    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'new-hash' }),
    );
  });

  it('should reject when the current password does not match', async () => {
    const user = buildUser();
    const userRepository = { findById: jest.fn().mockResolvedValue(user), update: jest.fn() };
    const hashService = { compare: jest.fn().mockResolvedValue(false), hash: jest.fn() };

    const useCase = new ChangeOwnPasswordUseCase(userRepository as never, hashService);

    await expect(
      useCase.execute(user.id, { currentPassword: 'Wrong@123', newPassword: 'NewPass@456' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should reject when the new password equals the current one', async () => {
    const user = buildUser();
    const userRepository = { findById: jest.fn().mockResolvedValue(user), update: jest.fn() };
    const hashService = { compare: jest.fn().mockResolvedValue(true), hash: jest.fn() };

    const useCase = new ChangeOwnPasswordUseCase(userRepository as never, hashService);

    await expect(
      useCase.execute(user.id, {
        currentPassword: 'CurrentPass@123',
        newPassword: 'CurrentPass@123',
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should reject when the new password does not meet the strength policy', async () => {
    const user = buildUser();
    const userRepository = { findById: jest.fn().mockResolvedValue(user), update: jest.fn() };
    const hashService = { compare: jest.fn().mockResolvedValue(true), hash: jest.fn() };

    const useCase = new ChangeOwnPasswordUseCase(userRepository as never, hashService);

    await expect(
      useCase.execute(user.id, { currentPassword: 'CurrentPass@123', newPassword: 'weak' }),
    ).rejects.toThrow(DomainValidationException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});
