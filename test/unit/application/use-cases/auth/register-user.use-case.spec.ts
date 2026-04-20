import { ResourceConflictException } from '@application/exceptions/resource-conflict.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { RegisterUserUseCase } from '@application/use-cases/auth/register-user.use-case';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    useCase = new RegisterUserUseCase(userRepository, hashService);
  });

  it('should register a new user successfully', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (user) => {
      return createMockUser({
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    });

    const result = await useCase.execute({
      name: 'Rafael Neves',
      email: 'rafael@email.com',
      password: 'Senha@123',
    });

    expect(result.name).toBe('Rafael Neves');
    expect(result.email).toBe('rafael@email.com');
    expect(result.role).toBe(UserRole.ATTENDANT);
    expect(result.isActive).toBe(true);
    expect(hashService.hash).toHaveBeenCalledWith('Senha@123');
    expect(userRepository.create).toHaveBeenCalled();
  });

  it('should register with specific role', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (user) => {
      return createMockUser({ role: user.role });
    });

    const result = await useCase.execute({
      name: 'Guilherme Salvador',
      email: 'guilherme@email.com',
      password: 'Senha@123',
      role: UserRole.MECHANIC,
    });

    expect(result.role).toBe(UserRole.MECHANIC);
  });

  it('should throw ResourceConflictException if email already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(createMockUser());

    await expect(
      useCase.execute({
        name: 'Duplicado',
        email: 'rafael@email.com',
        password: 'Senha@123',
      }),
    ).rejects.toThrow(ResourceConflictException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('should normalize email before checking for duplicates', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.create.mockImplementation(async (user) => createMockUser({ email: user.email }));

    await useCase.execute({
      name: 'Rafael',
      email: '  RAFAEL@Email.COM  ',
      password: 'Senha@123',
    });

    expect(userRepository.findByEmail).toHaveBeenCalledWith('rafael@email.com');
  });
});
