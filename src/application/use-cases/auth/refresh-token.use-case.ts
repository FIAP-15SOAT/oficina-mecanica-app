import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import { ITokenService, TokenPair, TokenPayload } from '@domain/interfaces/token.service.interface';
import { IUserRepository } from '@domain/interfaces/user.repository.interface';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
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
