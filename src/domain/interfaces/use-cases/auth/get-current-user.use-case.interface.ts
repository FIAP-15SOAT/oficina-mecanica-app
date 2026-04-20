import { GetCurrentUserOutputDto } from '@domain/interfaces/use-cases/auth/dto/get-current-user.dto';

export interface IGetCurrentUserUseCase {
  execute(userId: string): Promise<GetCurrentUserOutputDto>;
}
