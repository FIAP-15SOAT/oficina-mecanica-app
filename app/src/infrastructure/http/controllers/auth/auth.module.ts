import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';

import { AuthController as AuthCleanController } from '@interface-adapters/auth/auth.controller';
import { AuthController } from './auth.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), InfrastructureServicesModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AuthCleanController,
      useFactory: (
        userRepository: IUserRepository,
        hashService: IHashService,
        tokenService: ITokenService,
        logger: ILogger,
      ) =>
        new AuthCleanController(
          new AuthenticateUserUseCase(
            userRepository,
            hashService,
            tokenService,
            logger.forContext(AuthenticateUserUseCase.name),
          ),
          new GetCurrentUserUseCase(userRepository),
          new RefreshTokenUseCase(
            userRepository,
            tokenService,
            logger.forContext(RefreshTokenUseCase.name),
          ),
        ),
      inject: ['IUserRepository', 'IHashService', 'ITokenService', 'ILogger'],
    },
    JwtStrategy,
  ],
  exports: [JwtStrategy],
})
export class AuthModule {}
