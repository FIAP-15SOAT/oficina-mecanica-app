import { Customer } from '@domain/entities/customer.entity';
import { FindAllCustomersOutputDto } from '@domain/interfaces/use-cases/customer/dto/find-all-customers.dto';
import { CustomerDataResponseDto } from './dto/customer-response.dto';
import { CustomerPaginatedResponseDto } from './dto/customer-paginated-response.dto';

export class CustomerPresenter {
  static toDataResponse(customer: Customer): CustomerDataResponseDto {
    return { data: customer };
  }

  static toPaginatedDataResponse(result: FindAllCustomersOutputDto): CustomerPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }
}
