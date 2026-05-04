import { randomUUID } from 'node:crypto';
import { UserController } from '@presentation/user/user.controller';
import { createMockUser } from '../../../helpers/user-mock.factory';
import { CreateUserRequestDto } from '@presentation/user/dto/create-user-request.dto';
import { UpdateUserRequestDto } from '@presentation/user/dto/update-user-request.dto';
import { UpdateUserStatusRequestDto } from '@presentation/user/dto/update-user-status-request.dto';
import { ICreateUserUseCase } from '@domain/interfaces/use-cases/user/create-user.use-case.interface';
import { IFindUserByIdUseCase } from '@domain/interfaces/use-cases/user/find-user-by-id.use-case.interface';
import { IFindAllUsersUseCase } from '@domain/interfaces/use-cases/user/find-all-users.use-case.interface';
import { IUpdateUserUseCase } from '@domain/interfaces/use-cases/user/update-user.use-case.interface';
import { IUpdateUserStatusUseCase } from '@domain/interfaces/use-cases/user/update-user-status.use-case.interface';
import { IDeleteUserUseCase } from '@domain/interfaces/use-cases/user/delete-user.use-case.interface';
import { UserRole } from '@domain/enums/user-role.enum';

describe('UserController', () => {
  let controller: UserController;
  let createUserUseCase: jest.Mocked<ICreateUserUseCase>;
  let findUserByIdUseCase: jest.Mocked<IFindUserByIdUseCase>;
  let findAllUsersUseCase: jest.Mocked<IFindAllUsersUseCase>;
  let updateUserUseCase: jest.Mocked<IUpdateUserUseCase>;
  let updateUserStatusUseCase: jest.Mocked<IUpdateUserStatusUseCase>;
  let deleteUserUseCase: jest.Mocked<IDeleteUserUseCase>;

  beforeEach(() => {
    createUserUseCase = { execute: jest.fn() };
    findUserByIdUseCase = { execute: jest.fn() };
    findAllUsersUseCase = { execute: jest.fn() };
    updateUserUseCase = { execute: jest.fn() };
    updateUserStatusUseCase = { execute: jest.fn() };
    deleteUserUseCase = { execute: jest.fn() };

    controller = new UserController(
      createUserUseCase,
      findUserByIdUseCase,
      findAllUsersUseCase,
      updateUserUseCase,
      updateUserStatusUseCase,
      deleteUserUseCase,
    );
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const request: CreateUserRequestDto = {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'SecurePass123!',
        role: UserRole.MECHANIC,
      };

      const createdUser = createMockUser({
        name: request.name,
        email: request.email,
        role: request.role,
      });

      createUserUseCase.execute.mockResolvedValue(createdUser.toPublicView());

      const result = await controller.create(request);

      expect(result).toEqual({ data: createdUser.toPublicView() });
      expect(createUserUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const users = [
        createMockUser({ id: randomUUID(), name: 'User 1' }),
        createMockUser({ id: randomUUID(), name: 'User 2' }),
      ];

      const usersPublicView = users.map((u) => u.toPublicView());
      const paginatedResult = {
        items: usersPublicView,
        pagination: {
          totalRecords: 2,
          totalPages: 1,
          page: 1,
          limit: 10,
        },
      };

      findAllUsersUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: paginatedResult.items,
        pagination: paginatedResult.pagination,
      });
      expect(findAllUsersUseCase.execute).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });

    it('should use default pagination when not provided', async () => {
      const paginatedResult = {
        items: [],
        pagination: {
          totalRecords: 0,
          totalPages: 0,
          page: 1,
          limit: 10,
        },
      };

      findAllUsersUseCase.execute.mockResolvedValue(paginatedResult);

      const result = await controller.findAll({});

      expect(result).toEqual({
        data: paginatedResult.items,
        pagination: paginatedResult.pagination,
      });
      expect(findAllUsersUseCase.execute).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const id = randomUUID();
      const user = createMockUser({ id });

      findUserByIdUseCase.execute.mockResolvedValue(user.toPublicView());

      const result = await controller.findById(id);

      expect(result).toEqual({ data: user.toPublicView() });
      expect(findUserByIdUseCase.execute).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const id = randomUUID();
      const request: UpdateUserRequestDto = {
        name: 'Updated Name',
        email: 'updated@example.com',
      };

      const updatedUser = createMockUser({
        id,
        name: request.name,
        email: request.email,
      });

      updateUserUseCase.execute.mockResolvedValue(updatedUser.toPublicView());

      const result = await controller.update(id, request);

      expect(result).toEqual({ data: updatedUser.toPublicView() });
      expect(updateUserUseCase.execute).toHaveBeenCalledWith(id, request);
    });
  });

  describe('updateStatus', () => {
    it('should update user status to inactive', async () => {
      const id = randomUUID();
      const request: UpdateUserStatusRequestDto = {
        active: false,
      };

      const updatedUser = createMockUser({
        id,
        isActive: false,
      });

      updateUserStatusUseCase.execute.mockResolvedValue(updatedUser.toPublicView());

      const result = await controller.updateStatus(id, request);

      expect(result).toEqual({ data: updatedUser.toPublicView() });
      expect(updateUserStatusUseCase.execute).toHaveBeenCalledWith(id, false);
    });

    it('should update user status to active', async () => {
      const id = randomUUID();
      const request: UpdateUserStatusRequestDto = {
        active: true,
      };

      const updatedUser = createMockUser({
        id,
        isActive: true,
      });

      updateUserStatusUseCase.execute.mockResolvedValue(updatedUser.toPublicView());

      const result = await controller.updateStatus(id, request);

      expect(result).toEqual({ data: updatedUser.toPublicView() });
      expect(updateUserStatusUseCase.execute).toHaveBeenCalledWith(id, true);
    });
  });

  describe('delete', () => {
    it('should delete a user successfully', async () => {
      const id = randomUUID();

      deleteUserUseCase.execute.mockResolvedValue(undefined);

      await controller.delete(id);

      expect(deleteUserUseCase.execute).toHaveBeenCalledWith(id);
      expect(deleteUserUseCase.execute).toHaveBeenCalledTimes(1);
    });
  });
});
