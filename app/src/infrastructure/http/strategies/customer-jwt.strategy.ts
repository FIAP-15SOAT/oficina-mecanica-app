import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';

interface CustomerJwtClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/**
 * Estratégia Passport totalmente isolada da interna (spec §6.4/§12): verifica
 * RS256 com a chave pública, emissor e audiência do token externo. Nunca
 * compartilha verificador com a JwtStrategy — elimina a classe de ataque de
 * confusão de algoritmo por construção (a HS256 nunca alcança este código, e
 * este RS256 nunca alcança o verificador HS256 da JwtStrategy).
 */
@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor(
    configService: ConfigService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IUserCustomerRepository')
    private readonly userCustomerRepository: IUserCustomerRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService
        .getOrThrow<string>('CUSTOMER_JWT_PUBLIC_KEY')
        .replaceAll(String.raw`\n`, '\n'),
      algorithms: ['RS256'],
      issuer: configService.getOrThrow<string>('CUSTOMER_JWT_ISSUER'),
      audience: configService.getOrThrow<string>('CUSTOMER_JWT_AUDIENCE'),
    });
  }

  async validate(payload: CustomerJwtClaims): Promise<AuthenticatedPrincipal> {
    const user = await this.userRepository.findById(payload.sub);

    if (!user?.isActive) {
      throw new UnauthorizedException('Usuário inválido ou desativado');
    }

    const activeCustomerIds = await this.userCustomerRepository.findActiveCustomerIdsByUserId(
      user.id,
    );

    if (activeCustomerIds.length === 0) {
      throw new UnauthorizedException('Nenhum cliente ativo vinculado');
    }

    return { sub: user.id, authFlow: 'CUSTOMER', email: user.email.value };
  }
}
