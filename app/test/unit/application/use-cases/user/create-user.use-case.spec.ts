import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new CreateUserUseCase(userRepository, hashService);
  });

  it('should create user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByDocument.mockResolvedValue(null);
    userRepository.create.mockImplementation((user) =>
      Promise.resolve(
        createMockUser({
          name: user.name,
          email: user.email,
          document: user.document,
          role: user.role,
          isActive: user.isActive,
        }),
      ),
    );

    const result = await useCase.execute({
      name: 'Lucas Almeida',
      email: 'lucas@email.com',
      document: '12345678909',
      password: 'Senha@123',
      role: UserRole.MECHANIC,
    });

    expect(result.name).toBe('Lucas Almeida');
    expect(result.role).toBe(UserRole.MECHANIC);
    expect(hashService.hash).toHaveBeenCalledWith('Senha@123');
  });

  it('should throw DomainValidationException if password is weak', async () => {
    await expect(
      useCase.execute({
        name: 'Lucas Almeida',
        email: 'lucas@email.com',
        document: '12345678909',
        password: '123456',
        role: UserRole.MECHANIC,
      }),
    ).rejects.toThrow(DomainValidationException);

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(hashService.hash).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(createMockUser());

    await expect(
      useCase.execute({
        name: 'Duplicado',
        email: 'admin@email.com',
        document: '12345678909',
        password: 'Senha@123',
        role: UserRole.ATTENDANT,
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should throw ResourceConflictException if document already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByDocument.mockResolvedValue(createMockUser());

    await expect(
      useCase.execute({
        name: 'Duplicado',
        email: 'novo@email.com',
        document: '12345678909',
        password: 'Senha@123',
        role: UserRole.ATTENDANT,
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
