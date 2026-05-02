import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter';
import { ApplicationExceptionFilter } from './infrastructure/filters/application-exception.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { InfrastructureExceptionFilter } from './infrastructure/filters/infrastructure-exception.filter';

import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { AuthModule } from './presentation/auth/auth.module';
import { UserModule } from './presentation/user/user.module';
import { ServiceModule } from './presentation/service/service.module';
import { PartsSuppliesModule } from './presentation/parts-supplies/parts-supplies.module';
import { CustomersModule } from './presentation/customers/customers.module';
import { VehiclesModule } from './presentation/vehicles/vehicles.module';
import { WorkOrderModule } from './presentation/work-order/work-order.module';
import { QuoteModule } from './presentation/quote/quote.module';
import { StockModule } from './presentation/stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST', 'localhost'),
          port: config.get<number>('MAIL_PORT', 1025),
          ignoreTLS: true,
          secure: false,
        },
        defaults: {
          from: config.get<string>('MAIL_FROM', '"Oficina Mecânica" <noreply@oficina.local>'),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    ServiceModule,
    PartsSuppliesModule,
    CustomersModule,
    VehiclesModule,
    WorkOrderModule,
    QuoteModule,
    StockModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
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
