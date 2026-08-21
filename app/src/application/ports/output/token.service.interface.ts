import { UserRole } from '@domain/enums/user-role.enum';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  signTokenPair(payload: TokenPayload): TokenPair;
  signWithSecret(payload: Record<string, unknown>, secret: string, expiresIn: string): string;
  verifyWithSecret<T extends object = Record<string, unknown>>(token: string, secret: string): T;
  verifyRefreshToken(token: string): TokenPayload;
}

export interface CustomerTokenPayload {
  sub: string;
  email: string;
  type: 'customer';
}
