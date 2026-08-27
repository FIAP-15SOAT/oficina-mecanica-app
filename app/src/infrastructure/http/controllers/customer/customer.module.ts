import { Module } from '@nestjs/common';

import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { CreateUserCustomerAccessUseCase } from '@application/use-cases/customer/create-user-customer-access.use-case';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IUserCustomerAccessRepository } from '@domain/interfaces/repositories/user-customer-access.repository.interface';

import { CustomerController as CustomerCleanController } from '@interface-adapters/customer/customer.controller';
import { CustomerController } from './customer.controller';

@Module({
  controllers: [CustomerController],
  providers: [
    {
      provide: CustomerCleanController,
      useFactory: (
        customerRepository: ICustomerRepository,
        userRepository: IUserRepository,
        accessRepository: IUserCustomerAccessRepository,
      ) =>
        new CustomerCleanController(
          new CreateCustomerUseCase(customerRepository),
          new FindAllCustomersUseCase(customerRepository),
          new FindCustomerByIdUseCase(customerRepository),
          new UpdateCustomerUseCase(customerRepository),
          new DeleteCustomerUseCase(customerRepository),
          new CreateUserCustomerAccessUseCase(userRepository, customerRepository, accessRepository),
        ),
      inject: ['ICustomerRepository', 'IUserRepository', 'IUserCustomerAccessRepository'],
    },
  ],
})
export class CustomerModule {}
