import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/database/prisma';
import {
  ApplicationExceptionFilter,
  DomainExceptionFilter,
  InfrastructureExceptionFilter,
} from './infrastructure/filters';
import { AuthModule } from './presentation/auth/auth.module';
import { UserModule } from './presentation/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
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
