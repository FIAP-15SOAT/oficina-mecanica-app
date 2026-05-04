import { Customer } from '@domain/entities/customer.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { CustomerDataResponseDto } from './dto/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/customer-paginated-response.dto';

export class CustomerPresenter {
  static toDataResponse(customer: Customer): CustomerDataResponseDto {
    return { data: customer };
  }

  static toPaginatedDataResponse(result: PaginatedResult<Customer>): CustomerPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
