import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { UserRole } from '@domain/enums/user-role.enum';
import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';

describe('CreateUserUseCase', () => {
  it('should generate a password, hash it, and email it to the new user', async () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };
    const hashService = { hash: jest.fn().mockResolvedValue('hashed-generated-password') };
    const emailSender = { send: jest.fn().mockResolvedValue(undefined) };
    const logger = { error: jest.fn() };

    const useCase = new CreateUserUseCase(
      userRepository as never,
      hashService as never,
      emailSender,
      logger as never,
    );

    const result = await useCase.execute({
      name: 'Novo Funcionário',
      email: 'novo@example.com',
      role: UserRole.ATTENDANT,
    });

    expect(result.email).toBe('novo@example.com');
    expect(hashService.hash).toHaveBeenCalledWith(expect.any(String));
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: 'novo@example.com' }),
    );
    expect(result).not.toHaveProperty('password');
  });

  it('should throw when the email is already registered', async () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'existing' }),
      create: jest.fn(),
    };
    const hashService = { hash: jest.fn() };
    const emailSender = { send: jest.fn() };
    const logger = { error: jest.fn() };

    const useCase = new CreateUserUseCase(
      userRepository as never,
      hashService as never,
      emailSender,
      logger as never,
    );

    await expect(
      useCase.execute({ name: 'Novo', email: 'existing@example.com', role: UserRole.ATTENDANT }),
    ).rejects.toThrow(ResourceConflictException);
  });

  it('should not fail the whole operation when the email fails to send', async () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };
    const hashService = { hash: jest.fn().mockResolvedValue('hashed') };
    const emailSender = { send: jest.fn().mockRejectedValue(new Error('smtp down')) };
    const logger = { error: jest.fn() };

    const useCase = new CreateUserUseCase(
      userRepository as never,
      hashService as never,
      emailSender,
      logger as never,
    );

    await expect(
      useCase.execute({ name: 'Novo', email: 'novo@example.com', role: UserRole.ATTENDANT }),
    ).resolves.toBeDefined();
  });

  it('should log the error when the initial password email fails to send', async () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };
    const hashService = { hash: jest.fn().mockResolvedValue('hashed') };
    const sendError = new Error('smtp down');
    const emailSender = { send: jest.fn().mockRejectedValue(sendError) };
    const logger = { error: jest.fn() };

    const useCase = new CreateUserUseCase(
      userRepository as never,
      hashService as never,
      emailSender,
      logger as never,
    );

    await useCase.execute({
      name: 'Novo',
      email: 'novo@example.com',
      role: UserRole.ATTENDANT,
    });

    expect(logger.error).toHaveBeenCalledWith(expect.any(String), sendError);
  });
});
