import { ApiProperty } from '@nestjs/swagger';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';
import {
  UserCustomerAccessDataResponse,
  UserCustomerAccessResponse,
} from '@interface-adapters/customer/responses/user-customer-access.response';

export class UserCustomerAccessResponseDto implements UserCustomerAccessResponse {
  @ApiProperty({ description: 'ID do vínculo', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'ID do usuário vinculado', format: 'uuid' })
  userId!: string;

  @ApiProperty({ description: 'ID do cliente vinculado', format: 'uuid' })
  customerId!: string;

  @ApiProperty({ enum: AccessRelationship })
  relationship!: AccessRelationship;

  @ApiProperty({ description: 'Data de criação do vínculo' })
  createdAt!: Date;
}

export class UserCustomerAccessDataResponseDto implements UserCustomerAccessDataResponse {
  @ApiProperty({ type: UserCustomerAccessResponseDto })
  data!: UserCustomerAccessResponseDto;
}
