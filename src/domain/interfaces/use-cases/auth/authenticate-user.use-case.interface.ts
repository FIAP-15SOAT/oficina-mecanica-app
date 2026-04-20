import {
  AuthenticateUserInputDto,
  AuthenticateUserOutputDto,
} from '@domain/interfaces/use-cases/auth/dto/authenticate-user.dto';

export interface IAuthenticateUserUseCase {
  execute(input: AuthenticateUserInputDto): Promise<AuthenticateUserOutputDto>;
}
