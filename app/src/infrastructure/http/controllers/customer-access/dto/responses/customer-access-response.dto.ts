import { ApiProperty } from '@nestjs/swagger';
import {
  AccessUserListResponse,
  CustomerAccessDataResponse,
  CustomerAccessResponse,
  LinkedCustomerListResponse,
} from '@interface-adapters/customer-access/responses/customer-access.response';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

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

export class AccessUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: UserRole, nullable: true })
  role!: UserRole | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AccessUserListResponseDto implements AccessUserListResponse {
  @ApiProperty({ type: [AccessUserResponseDto] })
  data!: AccessUserResponseDto[];
}

export class LinkedCustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CustomerType })
  type!: CustomerType;

  @ApiProperty()
  isActive!: boolean;
}

export class LinkedCustomerListResponseDto implements LinkedCustomerListResponse {
  @ApiProperty({ type: [LinkedCustomerResponseDto] })
  data!: LinkedCustomerResponseDto[];
}
