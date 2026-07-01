import { Customer } from '@domain/entities/customer.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  AddressResponse,
  CustomerDataResponse,
  CustomerPaginatedResponse,
  CustomerResponse,
} from './responses/customer.response';

export class CustomerPresenter {
  static toResponse(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      name: customer.name,
      document: customer.document.value,
      type: customer.type,
      email: customer.email.value,
      phone: customer.phone.value,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      address: customer.address ? CustomerPresenter.toAddress(customer.address) : null,
    };
  }

  private static toAddress(address: NonNullable<Customer['address']>): AddressResponse {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode.value,
    };
  }

  static toDataResponse(customer: Customer): CustomerDataResponse {
    return { data: CustomerPresenter.toResponse(customer) };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Customer>): CustomerPaginatedResponse {
    return {
      data: result.items.map((c) => CustomerPresenter.toResponse(c)),
      pagination: result.pagination,
    };
  }
}
