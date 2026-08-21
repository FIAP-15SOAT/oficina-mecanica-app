import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthenticateUserUseCase } from '@application/use-cases/auth/authenticate-user.use-case';
import { GetCurrentUserUseCase } from '@application/use-cases/auth/get-current-user.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { AuthenticateCustomerUseCase } from '@application/use-cases/auth/authenticate-customer.use-case';
import { RefreshCustomerTokenUseCase } from '@application/use-cases/auth/refresh-customer-token.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { ChangeOwnCustomerPasswordUseCase } from '@application/use-cases/auth/change-own-customer-password.use-case';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { JwtStrategy } from '@infrastructure/http/strategies/jwt.strategy';
import { JwtCustomerStrategy } from '@infrastructure/http/strategies/jwt-customer.strategy';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

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
        customerRepository: ICustomerRepository,
        hashService: IHashService,
        tokenService: ITokenService,
        configService: ConfigService,
      ) =>
        new AuthCleanController(
          new AuthenticateUserUseCase(userRepository, hashService, tokenService),
          new GetCurrentUserUseCase(userRepository),
          new RefreshTokenUseCase(userRepository, tokenService),
          new AuthenticateCustomerUseCase(
            customerRepository,
            hashService,
            tokenService,
            configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
            configService.getOrThrow<string>('CUSTOMER_JWT_REFRESH_SECRET'),
            configService.get<string>('CUSTOMER_JWT_EXPIRATION', '15m'),
            configService.get<string>('CUSTOMER_JWT_REFRESH_EXPIRATION', '7d'),
          ),
          new RefreshCustomerTokenUseCase(
            customerRepository,
            tokenService,
            configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
            configService.getOrThrow<string>('CUSTOMER_JWT_REFRESH_SECRET'),
            configService.get<string>('CUSTOMER_JWT_EXPIRATION', '15m'),
            configService.get<string>('CUSTOMER_JWT_REFRESH_EXPIRATION', '7d'),
          ),
          new FindCustomerByIdUseCase(customerRepository),
          new ChangeOwnCustomerPasswordUseCase(customerRepository, hashService),
        ),
      inject: [
        'IUserRepository',
        'ICustomerRepository',
        'IHashService',
        'ITokenService',
        ConfigService,
      ],
    },
    JwtStrategy,
    JwtCustomerStrategy,
  ],
  exports: [JwtStrategy, JwtCustomerStrategy],
})
export class AuthModule {}
