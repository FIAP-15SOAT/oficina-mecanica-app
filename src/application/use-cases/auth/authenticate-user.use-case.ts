import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import { UserRole } from '@domain/enums/user-role.enum';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticateUserOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedAccessException('Usuário desativado');
    }

    const passwordMatches = await this.hashService.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken } = this.tokenService.signTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
