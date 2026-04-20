import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { ApplicationExceptionFilter } from './infrastructure/filters/application-exception.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { InfrastructureExceptionFilter } from './infrastructure/filters/infrastructure-exception.filter';

import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { AuthModule } from './presentation/auth/auth.module';
import { UserModule } from './presentation/user/user.module';
import { ServiceModule } from './presentation/service/service.module';
import { PartsSuppliesModule } from './presentation/parts-supplies/parts-supplies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ServiceModule,
    PartsSuppliesModule,
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
