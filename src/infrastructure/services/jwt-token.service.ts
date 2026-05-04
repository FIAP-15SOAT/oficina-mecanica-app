import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ITokenService,
  TokenPair,
  TokenPayload,
} from '@domain/interfaces/services/token.service.interface';

@Injectable()
export class JwtTokenService implements ITokenService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload);
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiresIn as `${number}d`,
    });
  }

  signTokenPair(payload: TokenPayload): TokenPair {
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
    };
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token, {
      secret: this.refreshSecret,
    });
  }

  signWithSecret(payload: Record<string, unknown>, secret: string, expiresIn: string): string {
    return this.jwtService.sign(payload as object, {
      secret,
      expiresIn: expiresIn as unknown as `${number}m`,
    });
  }

  verifyWithSecret<T extends object = Record<string, unknown>>(token: string, secret: string): T {
    return this.jwtService.verify<T>(token, { secret });
  }
}
