import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { ResetCustomerPasswordUseCase } from '@application/use-cases/customer/reset-customer-password.use-case';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';
import { IEmailSenderService } from '@application/ports/output/email-sender.service.interface';

import { CustomerController as CustomerCleanController } from '@interface-adapters/customer/customer.controller';
import { CustomerController } from './customer.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [CustomerController],
  providers: [
    {
      provide: CustomerCleanController,
      useFactory: (
        customerRepository: ICustomerRepository,
        hashService: IHashService,
        emailSenderService: IEmailSenderService,
      ) =>
        new CustomerCleanController(
          new CreateCustomerUseCase(customerRepository, hashService, emailSenderService),
          new FindAllCustomersUseCase(customerRepository),
          new FindCustomerByIdUseCase(customerRepository),
          new UpdateCustomerUseCase(customerRepository),
          new DeleteCustomerUseCase(customerRepository),
          new ResetCustomerPasswordUseCase(customerRepository, hashService, emailSenderService),
        ),
      inject: ['ICustomerRepository', 'IHashService', 'IEmailSenderService'],
    },
  ],
})
export class CustomerModule {}
