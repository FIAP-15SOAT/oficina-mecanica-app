import { Customer } from '@domain/entities/customer.entity';
import { FindAllCustomersOutputDto } from '@domain/interfaces/use-cases/customer/dto/find-all-customers.dto';
import { CustomerDataResponseDto } from './dto/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/customer-paginated-response.dto';

export class CustomerPresenter {
  static toResponse(customer: Customer): CustomerDataResponseDto {
    return { data: customer };
  }

  static toPaginatedResponse(result: FindAllCustomersOutputDto): CustomerPaginatedResponseDto {
    return {
      data: result.items,
      totalRecords: result.totalRecords,
      totalPages: result.totalPages,
      page: result.page,
      limit: result.limit,
    };
  }
}
