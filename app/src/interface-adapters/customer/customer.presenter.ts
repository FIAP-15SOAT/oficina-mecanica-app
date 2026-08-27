import { Customer } from '@domain/entities/customer.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import {
  AddressResponse,
  CustomerDataResponse,
  CustomerPaginatedResponse,
  CustomerResponse,
} from './responses/customer.response';
import {
  UserCustomerAccessDataResponse,
  UserCustomerAccessResponse,
} from './responses/user-customer-access.response';

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

  static toAccessResponse(access: UserCustomerAccess): UserCustomerAccessResponse {
    return {
      id: access.id,
      userId: access.userId,
      customerId: access.customerId,
      relationship: access.relationship,
      createdAt: access.createdAt,
    };
  }

  static toAccessDataResponse(access: UserCustomerAccess): UserCustomerAccessDataResponse {
    return { data: CustomerPresenter.toAccessResponse(access) };
  }
}
