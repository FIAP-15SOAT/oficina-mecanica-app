import { randomUUID } from 'node:crypto';

import { AuthController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';

import { LoginRequest } from '@interface-adapters/auth/requests/login-request';
import { RefreshTokenRequest } from '@interface-adapters/auth/requests/refresh-token-request';
import { LoginCustomerRequest } from '@interface-adapters/auth/requests/login-customer-request';
import { RefreshCustomerTokenRequest } from '@interface-adapters/auth/requests/refresh-customer-token-request';

import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';
import { IAuthenticateCustomerUseCase } from '@application/ports/input/auth/authenticate-customer.use-case.interface';
import { IRefreshCustomerTokenUseCase } from '@application/ports/input/auth/refresh-customer-token.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { ChangeOwnCustomerPasswordUseCase } from '@application/use-cases/auth/change-own-customer-password.use-case';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { RefreshTokenOutputDto } from '@application/ports/input/auth/dto/refresh-token.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';
import { AuthenticateCustomerOutputDto } from '@application/ports/input/auth/dto/authenticate-customer.dto';
import { RefreshCustomerTokenOutputDto } from '@application/ports/input/auth/dto/refresh-customer-token.dto';

import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { createMockCustomer } from '../../../helpers/customer-mock.factory';

describe('AuthController', () => {
  let controller: AuthController;
  let authenticateUseCase: jest.Mocked<IAuthenticateUserUseCase>;
  let getCurrentUserUseCase: jest.Mocked<IGetCurrentUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<IRefreshTokenUseCase>;
  let authenticateCustomerUseCase: jest.Mocked<IAuthenticateCustomerUseCase>;
  let refreshCustomerTokenUseCase: jest.Mocked<IRefreshCustomerTokenUseCase>;
  let findCustomerByIdUseCase: jest.Mocked<IFindCustomerByIdUseCase>;
  let changeOwnCustomerPasswordUseCase: jest.Mocked<ChangeOwnCustomerPasswordUseCase>;

  beforeEach(() => {
    authenticateUseCase = { execute: jest.fn() };
    getCurrentUserUseCase = { execute: jest.fn() };
    refreshTokenUseCase = { execute: jest.fn() };
    authenticateCustomerUseCase = { execute: jest.fn() };
    refreshCustomerTokenUseCase = { execute: jest.fn() };
    findCustomerByIdUseCase = { execute: jest.fn() };
    changeOwnCustomerPasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ChangeOwnCustomerPasswordUseCase>;

    controller = new AuthController(
      authenticateUseCase,
      getCurrentUserUseCase,
      refreshTokenUseCase,
      authenticateCustomerUseCase,
      refreshCustomerTokenUseCase,
      findCustomerByIdUseCase,
      changeOwnCustomerPasswordUseCase,
    );
  });

  describe('login', () => {
    it('should authenticate the user and return tokens wrapped in data', async () => {
      const request: LoginRequest = {
        identifier: 'john.doe@example.com',
        password: 'SecurePass123!',
      };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'refresh-token-uuid',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      authenticateUseCase.execute.mockResolvedValue(authResult);

      const result = await controller.login(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(authResult));
      expect(authenticateUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return them wrapped in data', async () => {
      const request: RefreshTokenRequest = { refreshToken: 'valid-refresh-token' };

      const refreshResult: RefreshTokenOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: randomUUID(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      refreshTokenUseCase.execute.mockResolvedValue(refreshResult);

      const result = await controller.refresh(request);

      expect(result).toEqual(AuthPresenter.toAuthDataResponse(refreshResult));
      expect(refreshTokenUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('me', () => {
    it('should return the current user data wrapped in data', async () => {
      const userId = randomUUID();

      const currentUser: GetCurrentUserOutputDto = {
        id: userId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        document: '12345678909',
        role: UserRole.ATTENDANT,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      getCurrentUserUseCase.execute.mockResolvedValue(currentUser);

      const result = await controller.me(userId);

      expect(result).toEqual(AuthPresenter.toMeDataResponse(currentUser));
      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });

  describe('loginCustomer', () => {
    it('should authenticate the customer and return tokens wrapped in data', async () => {
      const request: LoginCustomerRequest = {
        identifier: 'cliente@email.com',
        password: 'Senha@123',
      };

      const authResult: AuthenticateCustomerOutputDto = {
        accessToken: 'customer-access-token',
        refreshToken: 'customer-refresh-token',
        customer: {
          id: randomUUID(),
          name: 'Maria Souza',
          email: 'cliente@email.com',
          document: '12345678909',
          type: CustomerType.INDIVIDUAL,
        },
      };

      authenticateCustomerUseCase.execute.mockResolvedValue(authResult);

      const result = await controller.loginCustomer(request);

      expect(result).toEqual({ data: authResult });
      expect(authenticateCustomerUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('refreshCustomer', () => {
    it('should refresh customer tokens and return them wrapped in data', async () => {
      const request: RefreshCustomerTokenRequest = { refreshToken: 'valid-refresh-token' };

      const refreshResult: RefreshCustomerTokenOutputDto = {
        accessToken: 'new-customer-access-token',
        refreshToken: 'new-customer-refresh-token',
      };

      refreshCustomerTokenUseCase.execute.mockResolvedValue(refreshResult);

      const result = await controller.refreshCustomer(request);

      expect(result).toEqual({ data: refreshResult });
      expect(refreshCustomerTokenUseCase.execute).toHaveBeenCalledWith(request);
    });
  });

  describe('meCustomer', () => {
    it('should return the current customer data wrapped in data', async () => {
      const customer = createMockCustomer();

      findCustomerByIdUseCase.execute.mockResolvedValue(customer);

      const result = await controller.meCustomer(customer.id);

      expect(result).toEqual(CustomerPresenter.toDataResponse(customer));
      expect(findCustomerByIdUseCase.execute).toHaveBeenCalledWith(customer.id);
    });
  });

  describe('changeOwnCustomerPassword', () => {
    it('should delegate to the change-own-customer-password use case', async () => {
      const customerId = randomUUID();
      const input = { currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' };

      changeOwnCustomerPasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.changeOwnCustomerPassword(customerId, input);

      expect(changeOwnCustomerPasswordUseCase.execute).toHaveBeenCalledWith(customerId, input);
    });
  });
});
