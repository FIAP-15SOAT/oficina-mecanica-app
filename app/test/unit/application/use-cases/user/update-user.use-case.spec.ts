import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { Email } from '@domain/value-objects/email.vo';
import { Document } from '@domain/value-objects/document.vo';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new UpdateUserUseCase(userRepository, hashService);
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
    const user = createMockUser({ email: Email.create('rafael@email.com') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(() => Promise.resolve(user));

    await useCase.execute('user-uuid-123', { email: 'rafael@email.com' });

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

  it('should update password with hash', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(() => Promise.resolve(createMockUser()));

    await useCase.execute('user-uuid-123', { password: 'NovaSenha@123' });

    expect(hashService.hash).toHaveBeenCalledWith('NovaSenha@123');
  });

  it('should throw DomainValidationException if new password is weak', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute('user-uuid-123', { password: 'weak' })).rejects.toThrow(
      DomainValidationException,
    );

    expect(hashService.hash).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente', { name: 'Novo' })).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('should update document checking uniqueness', async () => {
    const user = createMockUser({ document: Document.create('12345678909') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByDocument.mockResolvedValue(null);
    userRepository.update.mockImplementation((data) =>
      Promise.resolve(createMockUser({ document: data.document })),
    );

    const result = await useCase.execute('user-uuid-123', { document: '12345678000195' });

    expect(result.document).toBe('12345678000195');
    expect(userRepository.findByDocument).toHaveBeenCalledWith('12345678000195');
  });

  it('should allow keeping the same document', async () => {
    const user = createMockUser({ document: Document.create('12345678909') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(() => Promise.resolve(user));

    await useCase.execute('user-uuid-123', { document: '123.456.789-09' });

    expect(userRepository.findByDocument).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if new document already exists', async () => {
    const user = createMockUser({ document: Document.create('12345678909') });
    userRepository.findById.mockResolvedValue(user);
    userRepository.findByDocument.mockResolvedValue(createMockUser({ id: 'outro-id' }));

    await expect(
      useCase.execute('user-uuid-123', { document: '12345678000195' }),
    ).rejects.toThrow(ResourceConflictException);
  });
});
