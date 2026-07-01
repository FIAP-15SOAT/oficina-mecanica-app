import { ApiProperty } from '@nestjs/swagger';
import { CustomerResponseDto } from './customer-response.dto';
import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';
import { CustomerPaginatedResponse } from '@interface-adapters/customer/responses/customer.response';

export class CustomerPaginatedResponseDto
  extends PaginatedResponseDto<CustomerResponseDto>
  implements CustomerPaginatedResponse
{
  @ApiProperty({ type: [CustomerResponseDto], description: 'Clientes da página atual' })
  data!: CustomerResponseDto[];
}
