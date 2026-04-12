import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  AuthenticateUserUseCase,
  GetCurrentUserUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
} from '../../application/use-cases/auth';
import { JwtStrategy } from '../../infrastructure/auth';
import { PrismaUserRepository } from '../../infrastructure/repositories';
import { BcryptHashService, JwtTokenService } from '../../infrastructure/services';
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
      provide: 'RegisterUserUseCase',
      useFactory: (userRepo: PrismaUserRepository, hashService: BcryptHashService) =>
        new RegisterUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'AuthenticateUserUseCase',
      useFactory: (
        userRepo: PrismaUserRepository,
        hashService: BcryptHashService,
        tokenService: JwtTokenService,
      ) => new AuthenticateUserUseCase(userRepo, hashService, tokenService),
      inject: ['IUserRepository', 'IHashService', 'ITokenService'],
    },
    {
      provide: 'GetCurrentUserUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new GetCurrentUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'RefreshTokenUseCase',
      useFactory: (userRepo: PrismaUserRepository, tokenService: JwtTokenService) =>
        new RefreshTokenUseCase(userRepo, tokenService),
      inject: ['IUserRepository', 'ITokenService'],
    },
    JwtStrategy,
  ],
  exports: ['IUserRepository', 'IHashService', JwtStrategy],
})
export class AuthModule {}
