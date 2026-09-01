import { randomUUID } from 'node:crypto';
import { IssuePasswordResetCodeUseCase } from '@application/use-cases/auth/issue-password-reset-code.use-case';
import { User } from '@domain/entities/user.entity';
import { UserRole } from '@domain/enums/user-role.enum';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';

describe('IssuePasswordResetCodeUseCase', () => {
  it('should hash and store the code, and email it to the user', async () => {
    const user = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      passwordHash: 'hash',
      role: UserRole.ATTENDANT,
    });
    const userRepository = { findById: jest.fn().mockResolvedValue(user) };
    const passwordResetCodeRepository = {
      upsert: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    const hashService = { hash: jest.fn().mockResolvedValue('hashed-code') };
    const emailSender = { send: jest.fn().mockResolvedValue(undefined) };
    const logger = { event: jest.fn() };

    const useCase = new IssuePasswordResetCodeUseCase(
      userRepository as never,
      passwordResetCodeRepository as never,
      hashService as never,
      emailSender,
      logger as never,
    );

    await useCase.execute(user.id, randomUUID());

    expect(passwordResetCodeRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: user.id, codeHash: 'hashed-code', attempts: 0 }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'maria@example.com' }),
    );
  });

  it('should throw when the user does not exist', async () => {
    const userRepository = { findById: jest.fn().mockResolvedValue(null) };
    const useCase = new IssuePasswordResetCodeUseCase(
      userRepository as never,
      { upsert: jest.fn() } as never,
      { hash: jest.fn() } as never,
      { send: jest.fn() },
      { event: jest.fn() } as never,
    );

    await expect(useCase.execute(randomUUID(), randomUUID())).rejects.toThrow(
      ResourceNotFoundException,
    );
  });
});
