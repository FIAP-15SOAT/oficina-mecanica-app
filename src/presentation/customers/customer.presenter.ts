import { Customer } from '@domain/entities/customer.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import {
  AddressResponseDto,
  CustomerDataResponseDto,
  CustomerResponseDto,
} from './dto/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/customer-paginated-response.dto';

export class CustomerPresenter {
  static toResponse(customer: Customer): CustomerResponseDto {
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

  private static toAddress(address: NonNullable<Customer['address']>): AddressResponseDto {
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode.value,
    };
  }

  static toDataResponse(customer: Customer): CustomerDataResponseDto {
    return { data: CustomerPresenter.toResponse(customer) };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Customer>): CustomerPaginatedResponseDto {
    return {
      data: result.items.map((c) => CustomerPresenter.toResponse(c)),
      pagination: result.pagination,
    };
  }
}
