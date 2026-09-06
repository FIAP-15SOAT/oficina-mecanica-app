import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { TokenPayload } from '@application/ports/output/token.service.interface';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';
import { AuthFlow } from '@domain/enums/auth-flow.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: TokenPayload): Promise<AuthenticatedPrincipal> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user?.isActive || !user.role) {
      throw new UnauthorizedException('Usuário inválido ou desativado');
    }

    if (
      typeof payload.iat !== 'number' ||
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Sessão expirada. Autentique-se novamente.');
    }

    return { sub: user.id, authFlow: AuthFlow.INTERNAL, email: user.email.value, role: user.role };
  }
}
