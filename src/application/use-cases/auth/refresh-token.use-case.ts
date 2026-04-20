import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  ITokenService,
  TokenPair,
  TokenPayload,
} from '@domain/interfaces/services/token.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  RefreshTokenInputDto,
  RefreshTokenOutputDto,
} from '@domain/interfaces/use-cases/auth/dto/refresh-token.dto';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInputDto): Promise<RefreshTokenOutputDto> {
    let payload: TokenPayload;

    try {
      payload = this.tokenService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new UnauthorizedAccessException('Refresh token inválido ou expirado');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedAccessException('Usuário inválido ou desativado');
    }

    const newTokenPair: TokenPair = this.tokenService.signTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
