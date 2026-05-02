import { ApiProperty } from '@nestjs/swagger';
import { CustomerResponseDto } from './customer-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export class CustomerPaginatedResponseDto extends PaginatedResponseDto<CustomerResponseDto> {
  @ApiProperty({ type: [CustomerResponseDto], description: 'Clientes da página atual' })
  data!: CustomerResponseDto[];
}
