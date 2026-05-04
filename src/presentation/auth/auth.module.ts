import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { JwtTokenService } from '@infrastructure/services/jwt-token.service';
import { BcryptHashService } from '@infrastructure/services/bcrypt-hash.service';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { ITokenService } from '@domain/interfaces/services/token.service.interface';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '15m') as `${number}m`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: 'IHashService',
      useClass: BcryptHashService,
    },
    {
      provide: 'ITokenService',
      useClass: JwtTokenService,
    },
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
