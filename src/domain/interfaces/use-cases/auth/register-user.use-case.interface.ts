import {
  RegisterUserInputDto,
  RegisterUserOutputDto,
} from '@domain/interfaces/use-cases/auth/dto/register-user.dto';

export interface IRegisterUserUseCase {
  execute(input: RegisterUserInputDto): Promise<RegisterUserOutputDto>;
}
