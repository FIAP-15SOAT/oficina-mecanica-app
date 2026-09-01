import { ApiProperty } from '@nestjs/swagger';
import {
  CustomerAccessDataResponse,
  CustomerAccessResponse,
} from '@interface-adapters/customer-access/responses/customer-access.response';

export class CustomerAccessResponseDto implements CustomerAccessResponse {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  initialPasswordSent!: boolean;
}

export class CustomerAccessDataResponseDto implements CustomerAccessDataResponse {
  @ApiProperty({ type: CustomerAccessResponseDto })
  data!: CustomerAccessResponseDto;
}
