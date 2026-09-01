import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { GrantCustomerAccessUseCase } from '@application/use-cases/customer-access/grant-customer-access.use-case';

import { IUnitOfWork } from '@domain/interfaces/repositories/unit-of-work.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';
import { ILogger } from '@application/ports/output/logger.service.interface';

import { CustomerAccessController as CustomerAccessCleanController } from '@interface-adapters/customer-access/customer-access.controller';
import { CustomerAccessController } from './customer-access.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [CustomerAccessController],
  providers: [
    {
      provide: CustomerAccessCleanController,
      useFactory: (
        unitOfWork: IUnitOfWork,
        hashService: IHashService,
        emailSender: IEmailSenderService,
        logger: ILogger,
      ) =>
        new CustomerAccessCleanController(
          new GrantCustomerAccessUseCase(
            unitOfWork,
            hashService,
            emailSender,
            logger.forContext(GrantCustomerAccessUseCase.name),
          ),
        ),
      inject: ['IUnitOfWork', 'IHashService', 'IEmailSenderService', 'ILogger'],
    },
  ],
  exports: [CustomerAccessCleanController],
})
export class CustomerAccessModule {}
