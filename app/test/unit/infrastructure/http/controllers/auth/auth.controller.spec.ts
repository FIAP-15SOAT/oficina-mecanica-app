import { randomUUID } from 'node:crypto';

import { AuthController } from '@infrastructure/http/controllers/auth/auth.controller';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';
import { AuthPresenter } from '@interface-adapters/auth/auth.presenter';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';

import { LoginRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/login-request.dto';
import { RefreshTokenRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/refresh-token-request.dto';
import { LoginCustomerRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/login-customer-request.dto';
import { RefreshCustomerTokenRequestDto } from '@infrastructure/http/controllers/auth/dto/requests/refresh-customer-token-request.dto';
import { AuthenticatedUser } from '@infrastructure/http/decorators/current-user.decorator';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';
import { AuthenticateCustomerOutputDto } from '@application/ports/input/auth/dto/authenticate-customer.dto';
import { RefreshCustomerTokenOutputDto } from '@application/ports/input/auth/dto/refresh-customer-token.dto';

import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { createMockCustomer } from '../../../../../helpers/customer-mock.factory';

describe('AuthController', () => {
  let httpController: AuthController;
  let cleanController: AuthCleanController;

  beforeEach(() => {
    cleanController = new AuthCleanController(
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
      { execute: jest.fn() },
    );
    httpController = new AuthController(cleanController);
  });

  describe('login', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: LoginRequestDto = { identifier: 'joao@email.com', password: 'SecurePass123!' };

      const authResult: AuthenticateUserOutputDto = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: randomUUID(),
          name: 'João',
          email: 'joao@email.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      const response = AuthPresenter.toAuthDataResponse(authResult);

      jest.spyOn(cleanController, 'login').mockResolvedValue(response);

      const result = await httpController.login(dto);

      expect(result).toBe(response);
      expect(cleanController.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: RefreshTokenRequestDto = { refreshToken: 'valid-refresh-token' };

      const refreshResult: AuthenticateUserOutputDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: randomUUID(),
          name: 'João',
          email: 'joao@email.com',
          document: '12345678909',
          role: UserRole.ATTENDANT,
        },
      };

      const response = AuthPresenter.toAuthDataResponse(refreshResult);

      jest.spyOn(cleanController, 'refresh').mockResolvedValue(response);

      const result = await httpController.refresh(dto);

      expect(result).toBe(response);
      expect(cleanController.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('me', () => {
    it('should delegate to the clean controller with the current user id', async () => {
      const authenticatedUser: AuthenticatedUser = {
        sub: randomUUID(),
        email: 'joao@email.com',
        role: UserRole.ATTENDANT,
      };

      const currentUser: GetCurrentUserOutputDto = {
        id: authenticatedUser.sub,
        name: 'João',
        email: authenticatedUser.email,
        document: '12345678909',
        role: authenticatedUser.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = AuthPresenter.toMeDataResponse(currentUser);

      jest.spyOn(cleanController, 'me').mockResolvedValue(response);

      const result = await httpController.me(authenticatedUser);

      expect(result).toBe(response);
      expect(cleanController.me).toHaveBeenCalledWith(authenticatedUser.sub);
    });
  });

  describe('loginCustomer', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: LoginCustomerRequestDto = {
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

      const response = { data: authResult };

      jest.spyOn(cleanController, 'loginCustomer').mockResolvedValue(response);

      const result = await httpController.loginCustomer(dto);

      expect(result).toBe(response);
      expect(cleanController.loginCustomer).toHaveBeenCalledWith(dto);
    });
  });

  describe('refreshCustomer', () => {
    it('should delegate to the clean controller and return its result', async () => {
      const dto: RefreshCustomerTokenRequestDto = { refreshToken: 'valid-refresh-token' };

      const refreshResult: RefreshCustomerTokenOutputDto = {
        accessToken: 'new-customer-access-token',
        refreshToken: 'new-customer-refresh-token',
      };

      const response = { data: refreshResult };

      jest.spyOn(cleanController, 'refreshCustomer').mockResolvedValue(response);

      const result = await httpController.refreshCustomer(dto);

      expect(result).toBe(response);
      expect(cleanController.refreshCustomer).toHaveBeenCalledWith(dto);
    });
  });

  describe('meCustomer', () => {
    it('should delegate to the clean controller with the current customer id', async () => {
      const customer = createMockCustomer();
      const customerTokenPayload: CustomerTokenPayload = {
        sub: customer.id,
        email: customer.email.value,
        type: 'customer',
      };

      const response = CustomerPresenter.toDataResponse(customer);

      jest.spyOn(cleanController, 'meCustomer').mockResolvedValue(response);

      const result = await httpController.meCustomer(customerTokenPayload);

      expect(result).toBe(response);
      expect(cleanController.meCustomer).toHaveBeenCalledWith(customerTokenPayload.sub);
    });
  });
});
