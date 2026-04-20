import { UserRole } from '@domain/enums/user-role.enum';
import { createMockUser, createMockUserRepository } from '../../../../helpers/mock-factories';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';

describe('FindAllUsersUseCase', () => {
  let useCase: FindAllUsersUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    userRepository = createMockUserRepository();
    useCase = new FindAllUsersUseCase(userRepository);
  });

  it('should return list of users', async () => {
    const users = [
      createMockUser({ id: '1', name: 'Rafael', role: UserRole.ADMIN }),
      createMockUser({ id: '2', name: 'Guilherme', role: UserRole.MECHANIC }),
    ];
    userRepository.findAll.mockResolvedValue(users);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Rafael');
    expect(result[1].name).toBe('Guilherme');
    expect(result[0]).not.toHaveProperty('passwordHash');
  });

  it('should return empty list when there are no users', async () => {
    userRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toHaveLength(0);
  });
});
