import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerRepository } from '@domain/interfaces/repositories/user-customer.repository.interface';
import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';
import { AuthFlow } from '@domain/enums/auth-flow.enum';

interface CustomerJwtClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/**
 * Estratégia Passport totalmente isolada da interna: verifica
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
      secretOrKey: CustomerJwtStrategy.resolvePublicKey(configService),
      algorithms: ['RS256'],
      issuer: configService.getOrThrow<string>('CUSTOMER_JWT_ISSUER'),
      audience: configService.getOrThrow<string>('CUSTOMER_JWT_AUDIENCE'),
    });
  }

  /**
   * Falha cedo, com uma mensagem que aponta a causa, em vez de deixar o
   * passport-jwt estourar um `TypeError: JwtStrategy requires a secret or key`
   * genérico no bootstrap — o cenário mais comum é o secret não cadastrado
   * (string vazia) ou colado num formato que não é PEM.
   */
  private static resolvePublicKey(configService: ConfigService): string {
    const publicKey = configService
      .getOrThrow<string>('CUSTOMER_JWT_PUBLIC_KEY')
      .replaceAll(String.raw`\n`, '\n');

    if (!publicKey.includes('BEGIN PUBLIC KEY')) {
      throw new Error(
        'CUSTOMER_JWT_PUBLIC_KEY não é uma chave pública PEM válida ' +
          '(esperado um bloco "-----BEGIN PUBLIC KEY-----")',
      );
    }

    return publicKey;
  }

  async validate(payload: CustomerJwtClaims): Promise<AuthenticatedPrincipal> {
    if (typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Token sem expiração');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user?.isActive) {
      throw new UnauthorizedException('Usuário inválido ou desativado');
    }

    if (
      typeof payload.iat !== 'number' ||
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw new UnauthorizedException('Sessão expirada. Autentique-se novamente.');
    }

    const activeCustomerIds = await this.userCustomerRepository.findActiveCustomerIdsByUserId(
      user.id,
    );

    if (activeCustomerIds.length === 0) {
      throw new UnauthorizedException('Nenhum cliente ativo vinculado');
    }

    return { sub: user.id, authFlow: AuthFlow.CUSTOMER, email: user.email.value };
  }
}
