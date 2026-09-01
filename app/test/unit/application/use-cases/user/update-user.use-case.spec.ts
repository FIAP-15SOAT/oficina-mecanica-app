import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { Email } from '@domain/value-objects/email.vo';
import { User } from '@domain/entities/user.entity';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new UpdateUserUseCase(userRepository);
  });

  it('should update user name', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation((data) =>
      Promise.resolve(createMockUser({ name: data.name })),
    );

    const result = await useCase.execute('user-uuid-123', { name: 'Novo Nome' });

    expect(result.name).toBe('Novo Nome');
  });

  it('should update email checking uniqueness', async () => {
    const user = createMockUser({ email: Email.create('antigo@email.com') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.update.mockImplementation((data) =>
      Promise.resolve(createMockUser({ email: data.email })),
    );

    const result = await useCase.execute('user-uuid-123', { email: 'novo@email.com' });

    expect(result.email).toBe('novo@email.com');
    expect(userRepository.findByEmail).toHaveBeenCalledWith('novo@email.com');
  });

  it('should allow keeping the same email', async () => {
    const user = createMockUser({ email: Email.create('admin@email.com') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(() => Promise.resolve(user));

    await useCase.execute('user-uuid-123', { email: 'admin@email.com' });

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if new email already exists', async () => {
    const user = createMockUser({ email: Email.create('antigo@email.com') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByEmail.mockResolvedValue(createMockUser({ id: 'outro-id' }));

    await expect(
      useCase.execute('user-uuid-123', { email: 'existente@email.com' }),
    ).rejects.toThrow(ResourceConflictException);
  });

  it('should update role', async () => {
    const user = createMockUser({ role: UserRole.ATTENDANT });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation((data) =>
      Promise.resolve(createMockUser({ role: data.role })),
    );

    const result = await useCase.execute('user-uuid-123', { role: UserRole.ADMIN });

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente', { name: 'Novo' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should not accept a password field even if present on the input object', async () => {
    const user = User.create({
      name: 'Existing',
      email: 'existing@example.com',
      passwordHash: 'original-hash',
      role: UserRole.ATTENDANT,
    });
    const userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      update: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    const useCase = new UpdateUserUseCase(userRepository as never);

    const maliciousInput = { name: 'Changed', password: 'ShouldNotApply@123' } as never;
    const result = await useCase.execute(user.id, maliciousInput);

    expect(result.name).toBe('Changed');
    // passwordHash on the domain entity must remain untouched
    expect(user.passwordHash).toBe('original-hash');
  });
});
