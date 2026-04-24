import { Module } from '@nestjs/common';
import { PrismaCustomerRepository } from '@infrastructure/repositories/prisma-customer.repository';
import { CreateCustomerUseCase } from '@application/use-cases/customer/create-customer.use-case';
import { FindAllCustomersUseCase } from '@application/use-cases/customer/find-all-customers.use-case';
import { FindCustomerByIdUseCase } from '@application/use-cases/customer/find-customer-by-id.use-case';
import { UpdateCustomerUseCase } from '@application/use-cases/customer/update-customer.use-case';
import { DeleteCustomerUseCase } from '@application/use-cases/customer/delete-customer.use-case';
import { CustomersController } from './customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    {
      provide: 'ICustomerRepository',
      useClass: PrismaCustomerRepository,
    },
    {
      provide: 'ICreateCustomerUseCase',
      useFactory: (repo: PrismaCustomerRepository) => new CreateCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IFindAllCustomersUseCase',
      useFactory: (repo: PrismaCustomerRepository) => new FindAllCustomersUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IFindCustomerByIdUseCase',
      useFactory: (repo: PrismaCustomerRepository) => new FindCustomerByIdUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IUpdateCustomerUseCase',
      useFactory: (repo: PrismaCustomerRepository) => new UpdateCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
    {
      provide: 'IDeleteCustomerUseCase',
      useFactory: (repo: PrismaCustomerRepository) => new DeleteCustomerUseCase(repo),
      inject: ['ICustomerRepository'],
    },
  ],
  exports: ['ICustomerRepository'],
})
export class CustomersModule {}
