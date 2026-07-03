import { GetCurrentUserOutputDto } from '@application/ports/input/auth/dto/get-current-user.dto';

export interface IGetCurrentUserUseCase {
  execute(userId: string): Promise<GetCurrentUserOutputDto>;
}
