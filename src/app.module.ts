import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import {
  ApplicationExceptionFilter,
  DomainExceptionFilter,
  InfrastructureExceptionFilter,
} from './infrastructure/filters';

import { PrismaModule } from './infrastructure/database/prisma';
import { AuthModule } from './presentation/auth/auth.module';
import { UserModule } from './presentation/user/user.module';
import { ServiceModule } from './presentation/service/service.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ServiceModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ApplicationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: InfrastructureExceptionFilter,
    },
  ],
})
export class AppModule {}
