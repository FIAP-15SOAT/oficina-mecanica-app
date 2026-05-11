import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';

export class StockReservationPartSupplyDto {
  @ApiProperty({
    description: 'ID único da Peça ou Insumo',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Nome da Peça ou Insumo', example: 'Filtro de Óleo' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada',
    example: 'Filtro para motor 1.0',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({ description: 'SKU único no Estoque', example: 'FO-001' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante',
    example: 'MANN-W712',
    nullable: true,
  })
  partNumber?: string | null;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  unit!: Unit;
}

export class StockReservationWorkOrderCustomerDto {
  @ApiProperty({
    description: 'ID único do Cliente',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Nome do Cliente', example: 'João da Silva' })
  name!: string;

  @ApiProperty({
    enum: CustomerType,
    description: 'Tipo de pessoa',
    example: CustomerType.INDIVIDUAL,
  })
  type!: CustomerType;

  @ApiProperty({ description: 'CPF ou CNPJ', example: '123.456.789-09' })
  document!: string;

  @ApiProperty({ description: 'Telefone', example: '(11) 99999-9999' })
  phone!: string;

  @ApiProperty({ description: 'E-mail', example: 'joao@email.com' })
  email!: string;
}

export class StockReservationWorkOrderVehicleDto {
  @ApiProperty({
    description: 'ID único do Veículo',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Placa do veículo', example: 'ABC-1234' })
  plate!: string;

  @ApiProperty({ description: 'Marca', example: 'Toyota' })
  brand!: string;

  @ApiProperty({ description: 'Modelo', example: 'Corolla' })
  model!: string;

  @ApiProperty({ description: 'Ano de fabricação', example: 2020 })
  year!: number;

  @ApiPropertyOptional({ description: 'Cor', example: 'Prata', nullable: true })
  color?: string | null;
}

export class StockReservationWorkOrderAssignedUserDto {
  @ApiProperty({
    description: 'ID único do Usuário',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Nome do Usuário', example: 'Carlos Mecânico' })
  name!: string;

  @ApiProperty({ description: 'E-mail do Usuário', example: 'carlos@oficina.com' })
  email!: string;

  @ApiProperty({ enum: UserRole, description: 'Perfil de acesso', example: UserRole.MECHANIC })
  role!: UserRole;
}

export class StockReservationWorkOrderDto {
  @ApiProperty({
    description: 'ID único da Ordem de Serviço',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Número sequencial da Ordem de Serviço', example: '000042' })
  number!: string;

  @ApiPropertyOptional({
    type: StockReservationWorkOrderCustomerDto,
    description: 'Dados do Cliente',
  })
  customer!: StockReservationWorkOrderCustomerDto;

  @ApiPropertyOptional({
    type: StockReservationWorkOrderVehicleDto,
    description: 'Dados do Veículo',
    nullable: true,
  })
  vehicle!: StockReservationWorkOrderVehicleDto;

  @ApiPropertyOptional({
    type: StockReservationWorkOrderAssignedUserDto,
    description: 'Mecânico responsável',
    nullable: true,
  })
  assignedUser?: StockReservationWorkOrderAssignedUserDto | null;
}

export class StockReservationResponseDto {
  @ApiProperty({
    description: 'ID único da Reserva de Estoque',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: StockReservationPartSupplyDto, description: 'Peça ou Insumo reservado' })
  partSupply!: StockReservationPartSupplyDto;

  @ApiProperty({
    type: StockReservationWorkOrderDto,
    description: 'Ordem de Serviço que originou a reserva',
  })
  workOrder!: StockReservationWorkOrderDto;

  @ApiProperty({ description: 'Quantidade reservada', example: 2 })
  quantity!: number;

  @ApiProperty({
    description: 'Data/hora da criação da reserva',
    example: '2026-04-21T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}

export class StockReservationDataResponseDto {
  @ApiProperty({ type: StockReservationResponseDto, description: 'Dados da Reserva de Estoque' })
  data!: StockReservationResponseDto;
}

export class StockReservationPaginatedResponseDto extends PaginatedResponseDto<StockReservationResponseDto> {
  @ApiProperty({ type: [StockReservationResponseDto], description: 'Reservas da página atual' })
  data!: StockReservationResponseDto[];
}
