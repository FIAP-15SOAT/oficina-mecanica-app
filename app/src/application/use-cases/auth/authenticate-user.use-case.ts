import { User } from '@domain/entities/user.entity';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import {
  AuthenticateUserInputDto,
  AuthenticateUserOutputDto,
} from '@application/ports/input/auth/dto/authenticate-user.dto';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

// Hash bcrypt válido de um valor arbitrário. Não é secreto: existe apenas para que
// `hashService.compare` sempre execute um trabalho real, evitando que os caminhos
// "identificador não encontrado" ou "usuário inativo" sejam mensuravelmente mais
// rápidos que o de "senha incorreta" (timing side-channel).
const DUMMY_PASSWORD_HASH = '$2b$12$PeogSPQuXXcQZWevnZMD7u5zikjQc626ibxG0hUlt7AuCb9vXvuBK';

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: AuthenticateUserInputDto): Promise<AuthenticateUserOutputDto> {
    const user = await this.findUserByIdentifier(input.identifier);
    const passwordMatches = await this.hashService.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user?.isActive || !passwordMatches) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email.value, role: user.role };
    const { accessToken, refreshToken } = this.tokenService.signTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        document: user.document.value,
        role: user.role,
      },
    };
  }

  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.includes('@')) {
      return this.userRepository.findByEmail(identifier);
    }

    return this.userRepository.findByDocument(Document.sanitize(identifier));
  }
}
