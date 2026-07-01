import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  ITokenService,
  TokenPair,
  TokenPayload,
} from '@application/ports/output/token.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  RefreshTokenInputDto,
  RefreshTokenOutputDto,
} from '@application/ports/input/auth/dto/refresh-token.dto';

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

    if (!user?.isActive) {
      throw new UnauthorizedAccessException('Usuário inválido ou desativado');
    }

    const newTokenPair: TokenPair = this.tokenService.signTokenPair({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    return {
      accessToken: newTokenPair.accessToken,
      refreshToken: newTokenPair.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        role: user.role,
      },
    };
  }
}
