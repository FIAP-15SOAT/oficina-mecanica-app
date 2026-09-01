import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import {
  MeDataResponse,
  MeResponse,
  MyCustomerSummary,
} from '@interface-adapters/me/responses/me.response';

export class MyCustomerSummaryDto implements MyCustomerSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CustomerType })
  type!: CustomerType;
}

export class MeResponseDto implements MeResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole, nullable: true })
  role!: UserRole | null;

  @ApiProperty({ type: [MyCustomerSummaryDto] })
  customers!: MyCustomerSummaryDto[];
}

export class MeDataResponseDto implements MeDataResponse {
  @ApiProperty({ type: MeResponseDto })
  data!: MeResponseDto;
}
