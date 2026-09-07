import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import {
  MeDataResponse,
  MeResponse,
  MyCustomerSummary,
} from '@interface-adapters/me/responses/me.response';

export class MyCustomerSummaryDto implements MyCustomerSummary {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do cliente',
  })
  id!: string;

  @ApiProperty({ example: 'Oficina Parceira LTDA', description: 'Nome do cliente' })
  name!: string;

  @ApiProperty({
    enum: CustomerType,
    example: CustomerType.COMPANY,
    description: 'Tipo do cliente: INDIVIDUAL (pessoa física) ou COMPANY (empresa)',
  })
  type!: CustomerType;
}

export class MeResponseDto implements MeResponse {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do usuário autenticado',
  })
  id!: string;

  @ApiProperty({ example: 'João da Silva', description: 'Nome do usuário autenticado' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário autenticado' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ATTENDANT,
    nullable: true,
    description: 'Papel do usuário — null para usuários externos (Cliente da Oficina)',
  })
  role!: UserRole | null;

  @ApiProperty({
    type: [MyCustomerSummaryDto],
    description:
      'Empresas que o usuário representa. Vazio para quem só acessa o próprio cadastro pessoa física.',
  })
  customers!: MyCustomerSummaryDto[];
}

export class MeDataResponseDto implements MeDataResponse {
  @ApiProperty({ type: MeResponseDto })
  data!: MeResponseDto;
}
