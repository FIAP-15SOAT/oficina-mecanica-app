import { IAuthenticateUserUseCase } from '@application/ports/input/auth/authenticate-user.use-case.interface';
import { IGetCurrentUserUseCase } from '@application/ports/input/auth/get-current-user.use-case.interface';
import { IRefreshTokenUseCase } from '@application/ports/input/auth/refresh-token.use-case.interface';
import { IAuthenticateCustomerUseCase } from '@application/ports/input/auth/authenticate-customer.use-case.interface';
import { IRefreshCustomerTokenUseCase } from '@application/ports/input/auth/refresh-customer-token.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { ChangeOwnCustomerPasswordUseCase } from '@application/use-cases/auth/change-own-customer-password.use-case';
import { ChangeOwnCustomerPasswordDto } from '@application/ports/input/auth/dto/change-own-customer-password.dto';

import { LoginRequest } from './requests/login-request';
import { RefreshTokenRequest } from './requests/refresh-token-request';
import { LoginCustomerRequest } from './requests/login-customer-request';
import { RefreshCustomerTokenRequest } from './requests/refresh-customer-token-request';

import { AuthPresenter } from './auth.presenter';
import { AuthDataResponse, MeDataResponse } from './responses/auth.response';
import {
  AuthCustomerDataResponse,
  AuthCustomerTokensDataResponse,
} from './responses/auth-customer.response';
import { CustomerPresenter } from '@interface-adapters/customer/customer.presenter';
import { CustomerDataResponse } from '@interface-adapters/customer/responses/customer.response';

export class AuthController {
  constructor(
    private readonly authenticateUseCase: IAuthenticateUserUseCase,
    private readonly getCurrentUserUseCase: IGetCurrentUserUseCase,
    private readonly refreshTokenUseCase: IRefreshTokenUseCase,
    private readonly authenticateCustomerUseCase: IAuthenticateCustomerUseCase,
    private readonly refreshCustomerTokenUseCase: IRefreshCustomerTokenUseCase,
    private readonly findCustomerByIdUseCase: IFindCustomerByIdUseCase,
    private readonly changeOwnCustomerPasswordUseCase: ChangeOwnCustomerPasswordUseCase,
  ) {}

  async login(input: LoginRequest): Promise<AuthDataResponse> {
    const result = await this.authenticateUseCase.execute(input);
    return AuthPresenter.toAuthDataResponse(result);
  }

  async refresh(input: RefreshTokenRequest): Promise<AuthDataResponse> {
    const result = await this.refreshTokenUseCase.execute(input);
    return AuthPresenter.toAuthDataResponse(result);
  }

  async me(userId: string): Promise<MeDataResponse> {
    const result = await this.getCurrentUserUseCase.execute(userId);
    return AuthPresenter.toMeDataResponse(result);
  }

  async loginCustomer(input: LoginCustomerRequest): Promise<AuthCustomerDataResponse> {
    const result = await this.authenticateCustomerUseCase.execute(input);
    return { data: result };
  }

  async refreshCustomer(
    input: RefreshCustomerTokenRequest,
  ): Promise<AuthCustomerTokensDataResponse> {
    const result = await this.refreshCustomerTokenUseCase.execute(input);
    return { data: result };
  }

  async meCustomer(customerId: string): Promise<CustomerDataResponse> {
    const customer = await this.findCustomerByIdUseCase.execute(customerId);
    return CustomerPresenter.toDataResponse(customer);
  }

  async changeOwnCustomerPassword(
    customerId: string,
    input: ChangeOwnCustomerPasswordDto,
  ): Promise<void> {
    await this.changeOwnCustomerPasswordUseCase.execute(customerId, input);
  }
}
