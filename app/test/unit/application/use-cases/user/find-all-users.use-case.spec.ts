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

  it('should return paginated list of users', async () => {
    const users = [
      createMockUser({ id: '1', name: 'Rafael', role: UserRole.ADMIN }),
      createMockUser({ id: '2', name: 'Guilherme', role: UserRole.MECHANIC }),
    ];
    userRepository.findAllPaginated.mockResolvedValue({
      items: users,
      total: 2,
    });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalRecords).toBe(2);
    expect(result.items[0].name).toBe('Rafael');
    expect(result.items[1].name).toBe('Guilherme');
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(userRepository.findAllPaginated).toHaveBeenCalledWith({ page: 1, limit: 10 }, {});
  });

  it('should return paginated list with role filter', async () => {
    const users = [createMockUser({ id: '1', name: 'Rafael', role: UserRole.ADMIN })];
    userRepository.findAllPaginated.mockResolvedValue({
      items: users,
      total: 1,
    });

    const result = await useCase.execute({ page: 1, limit: 10, role: UserRole.ADMIN });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalRecords).toBe(1);
    expect(userRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { role: UserRole.ADMIN },
    );
  });

  it('should return paginated list with name filter', async () => {
    const users = [createMockUser({ id: '1', name: 'Rafael', role: UserRole.ADMIN })];
    userRepository.findAllPaginated.mockResolvedValue({
      items: users,
      total: 1,
    });

    const result = await useCase.execute({ page: 1, limit: 10, name: 'Rafael' });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.totalRecords).toBe(1);
    expect(userRepository.findAllPaginated).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      { name: 'Rafael' },
    );
  });

  it('should return empty list when there are no users', async () => {
    userRepository.findAllPaginated.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalRecords).toBe(0);
  });
});
