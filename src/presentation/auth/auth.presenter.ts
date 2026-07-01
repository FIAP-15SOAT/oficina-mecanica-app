import { AuthenticateUserOutputDto } from '@application/ports/input/auth/dto/authenticate-user.dto';
import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';
import { AuthDataResponseDto } from './dto/auth-response.dto';
import { MeDataResponseDto } from './dto/me-response.dto';

export class AuthPresenter {
  static toAuthDataResponse(result: AuthenticateUserOutputDto): AuthDataResponseDto {
    return { data: result };
  }

  static toMeDataResponse(result: GetCurrentUserOutputDto): MeDataResponseDto {
    return { data: result };
  }
}
