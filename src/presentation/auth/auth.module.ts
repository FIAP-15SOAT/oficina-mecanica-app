import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { AuthController } from './auth.controller';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), InfrastructureServicesModule],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IAuthenticateUserUseCase',
      useFactory: (
        userRepo: IUserRepository,
        hashService: IHashService,
        tokenService: ITokenService,
      ) => new AuthenticateUserUseCase(userRepo, hashService, tokenService),
      inject: ['IUserRepository', 'IHashService', 'ITokenService'],
    },
    {
      provide: 'IGetCurrentUserUseCase',
      useFactory: (userRepo: IUserRepository) => new GetCurrentUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IRefreshTokenUseCase',
      useFactory: (userRepo: IUserRepository, tokenService: ITokenService) =>
        new RefreshTokenUseCase(userRepo, tokenService),
      inject: ['IUserRepository', 'ITokenService'],
    },
    JwtStrategy,
  ],
  exports: [JwtStrategy],
})
export class AuthModule {}
