import { ICreateCustomerUseCase } from '@application/ports/input/customer/create-customer.use-case.interface';
import { IFindAllCustomersUseCase } from '@application/ports/input/customer/find-all-customers.use-case.interface';
import { IFindCustomerByIdUseCase } from '@application/ports/input/customer/find-customer-by-id.use-case.interface';
import { IUpdateCustomerUseCase } from '@application/ports/input/customer/update-customer.use-case.interface';
import { IDeleteCustomerUseCase } from '@application/ports/input/customer/delete-customer.use-case.interface';
import { ResetCustomerPasswordUseCase } from '@application/use-cases/customer/reset-customer-password.use-case';

import { CreateCustomerRequest } from './requests/create-customer-request';
import { UpdateCustomerRequest } from './requests/update-customer-request';
import { FindAllCustomersQuery } from './requests/find-all-customers-query';

import { CustomerPresenter } from './customer.presenter';
import { CustomerDataResponse, CustomerPaginatedResponse } from './responses/customer.response';

export class CustomerController {
  constructor(
    private readonly createCustomerUseCase: ICreateCustomerUseCase,
    private readonly findAllCustomersUseCase: IFindAllCustomersUseCase,
    private readonly findCustomerByIdUseCase: IFindCustomerByIdUseCase,
    private readonly updateCustomerUseCase: IUpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: IDeleteCustomerUseCase,
    private readonly resetCustomerPasswordUseCase: ResetCustomerPasswordUseCase,
  ) {}

  async create(input: CreateCustomerRequest): Promise<CustomerDataResponse> {
    const customer = await this.createCustomerUseCase.execute(input);
    return CustomerPresenter.toDataResponse(customer);
  }

  async findAll(query: FindAllCustomersQuery): Promise<CustomerPaginatedResponse> {
    const result = await this.findAllCustomersUseCase.execute({
      ...query,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    });

    return CustomerPresenter.toPaginatedDataResponse(result);
  }

  async findById(id: string): Promise<CustomerDataResponse> {
    const customer = await this.findCustomerByIdUseCase.execute(id);
    return CustomerPresenter.toDataResponse(customer);
  }

  async update(id: string, input: UpdateCustomerRequest): Promise<CustomerDataResponse> {
    const customer = await this.updateCustomerUseCase.execute(id, input);
    return CustomerPresenter.toDataResponse(customer);
  }

  async remove(id: string): Promise<void> {
    await this.deleteCustomerUseCase.execute(id);
  }

  async resetPassword(customerId: string): Promise<void> {
    await this.resetCustomerPasswordUseCase.execute(customerId);
  }
}
