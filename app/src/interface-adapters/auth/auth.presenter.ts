import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';
import { RefreshTokenOutputDto } from '@application/ports/input/auth/dto/refresh-token.dto';
import {
  AuthDataResponse,
  AuthResponse,
  MeDataResponse,
  MeResponse,
} from './responses/auth.response';

export class AuthPresenter {
  static toAuthDataResponse(
    result: AuthenticateUserOutputDto | RefreshTokenOutputDto,
  ): AuthDataResponse {
    return { data: AuthPresenter.toAuthResponse(result) };
  }

  private static toAuthResponse(
    result: AuthenticateUserOutputDto | RefreshTokenOutputDto,
  ): AuthResponse {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        document: result.user.document,
        role: result.user.role,
      },
    };
  }

  static toMeDataResponse(result: GetCurrentUserOutputDto): MeDataResponse {
    return { data: AuthPresenter.toMeResponse(result) };
  }

  private static toMeResponse(result: GetCurrentUserOutputDto): MeResponse {
    return {
      id: result.id,
      name: result.name,
      email: result.email,
      document: result.document,
      role: result.role,
      isActive: result.isActive,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}
