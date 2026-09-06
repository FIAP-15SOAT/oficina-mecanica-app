import { ApiProperty } from '@nestjs/swagger';
import {
  AccessUserListResponse,
  CustomerAccessDataResponse,
  CustomerAccessResponse,
  LinkedCustomerListResponse,
} from '@interface-adapters/customer-access/responses/customer-access.response';
import { UserRole } from '@domain/enums/user-role.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';

export class AccessUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do usuário',
  })
  id!: string;

  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário' })
  name!: string;

  @ApiProperty({ example: 'joao@email.com', description: 'E-mail do usuário' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.ATTENDANT,
    nullable: true,
    description: 'Papel do usuário — null para usuários externos (Cliente da Oficina)',
  })
  role!: UserRole | null;

  @ApiProperty({ example: true, description: 'Indica se o usuário está ativo' })
  isActive!: boolean;

  @ApiProperty({
    example: '2026-04-20T12:00:00.000Z',
    format: 'date-time',
    description: 'Data de criação do usuário',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-04-20T12:00:00.000Z',
    format: 'date-time',
    description: 'Data da última atualização do usuário',
  })
  updatedAt!: Date;
}

export class AccessUserListResponseDto implements AccessUserListResponse {
  @ApiProperty({
    type: [AccessUserResponseDto],
    description: 'Usuários com acesso ao cliente',
  })
  data!: AccessUserResponseDto[];
}

export class LinkedCustomerResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do cliente',
  })
  id!: string;

  @ApiProperty({ example: 'João da Silva', description: 'Nome do cliente' })
  name!: string;

  @ApiProperty({
    enum: CustomerType,
    example: CustomerType.INDIVIDUAL,
    description: 'Tipo do cliente',
  })
  type!: CustomerType;

  @ApiProperty({ example: true, description: 'Indica se o cliente está ativo' })
  isActive!: boolean;
}

export class LinkedCustomerListResponseDto implements LinkedCustomerListResponse {
  @ApiProperty({
    type: [LinkedCustomerResponseDto],
    description: 'Clientes vinculados ao usuário',
  })
  data!: LinkedCustomerResponseDto[];
}

export class CustomerAccessResponseDto implements CustomerAccessResponse {
  @ApiProperty({ type: AccessUserResponseDto, description: 'Usuário criado ou vinculado' })
  user!: AccessUserResponseDto;

  @ApiProperty({
    type: LinkedCustomerResponseDto,
    description: 'Cliente ao qual o acesso foi concedido',
  })
  customer!: LinkedCustomerResponseDto;

  @ApiProperty({
    example: true,
    description: 'Indica se o e-mail com a senha inicial foi enviado com sucesso',
  })
  initialPasswordSent!: boolean;
}

export class CustomerAccessDataResponseDto implements CustomerAccessDataResponse {
  @ApiProperty({ type: CustomerAccessResponseDto, description: 'Dados do acesso concedido' })
  data!: CustomerAccessResponseDto;
}
