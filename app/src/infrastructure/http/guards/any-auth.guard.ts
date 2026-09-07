import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { AuthenticationFailedException } from '../../exceptions/authentication-failed.exception';

/**
 * Aceita token interno OU externo (GET /api/me e PATCH /api/me/password).
 * Passport tenta 'jwt' e depois 'customer-jwt' — cada um com seu próprio
 * verificador de algoritmo/chave; nenhum dos dois é relaxado para aceitar o
 * outro formato. Isto é apenas despacho de guard HTTP, não um verificador
 * compartilhado.
 */
@Injectable()
export class AnyAuthGuard extends AuthGuard(['jwt', 'customer-jwt']) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      throw new AuthenticationFailedException('Token de autenticação inválido ou ausente.');
    }
    return user as TUser;
  }
}
