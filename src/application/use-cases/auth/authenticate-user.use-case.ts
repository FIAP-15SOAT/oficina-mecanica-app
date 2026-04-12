import { UnauthorizedAccessException } from '../../exceptions';
import { UserRole } from '../../../domain/enums';
import { IHashService, ITokenService, IUserRepository } from '../../../domain/interfaces';

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
