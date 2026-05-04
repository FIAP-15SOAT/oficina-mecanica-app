import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { JwtStrategy } from '@infrastructure/auth/jwt.strategy';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { BcryptHashService } from '@infrastructure/services/bcrypt-hash.service';
import { JwtTokenService } from '@infrastructure/services/jwt-token.service';
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
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
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
        userRepo: PrismaUserRepository,
        hashService: BcryptHashService,
        tokenService: JwtTokenService,
      ) => new AuthenticateUserUseCase(userRepo, hashService, tokenService),
      inject: ['IUserRepository', 'IHashService', 'ITokenService'],
    },
    {
      provide: 'IGetCurrentUserUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new GetCurrentUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IRefreshTokenUseCase',
      useFactory: (userRepo: PrismaUserRepository, tokenService: JwtTokenService) =>
        new RefreshTokenUseCase(userRepo, tokenService),
      inject: ['IUserRepository', 'ITokenService'],
    },
    JwtStrategy,
  ],
  exports: ['IUserRepository', 'IHashService', JwtStrategy],
})
export class AuthModule {}
