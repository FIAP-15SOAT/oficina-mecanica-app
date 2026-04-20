import {
  RefreshTokenInputDto,
  RefreshTokenOutputDto,
} from '@domain/interfaces/use-cases/auth/dto/refresh-token.dto';

export interface IRefreshTokenUseCase {
  execute(input: RefreshTokenInputDto): Promise<RefreshTokenOutputDto>;
}
