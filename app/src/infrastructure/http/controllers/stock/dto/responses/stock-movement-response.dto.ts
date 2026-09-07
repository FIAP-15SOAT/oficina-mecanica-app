import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@domain/enums/stock-movement-type.enum';
import { CustomerType } from '@domain/enums/customer-type.enum';
import { UserRole } from '@domain/enums/user-role.enum';
import { PartSupplyCategory } from '@domain/enums/part-supply-category.enum';
import { Unit } from '@domain/enums/unit.enum';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import {
  StockMovementPaginatedResponse,
  StockMovementResponse,
  StockPartSupplyResponse,
  StockWorkOrderAssignedUserResponse,
  StockWorkOrderCustomerResponse,
  StockWorkOrderResponse,
  StockWorkOrderVehicleResponse,
} from '@interface-adapters/stock/responses/stock.response';

export class StockMovementPartSupplyDto implements StockPartSupplyResponse {
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
  description!: string | null;

  @ApiProperty({ description: 'SKU único no Estoque', example: 'FO-001' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Número de referência do fabricante',
    example: 'MANN-W712',
    nullable: true,
  })
  partNumber!: string | null;

  @ApiProperty({
    enum: PartSupplyCategory,
    description: 'Categoria: PART (Peça) ou SUPPLY (Insumo)',
    example: PartSupplyCategory.PART,
  })
  category!: PartSupplyCategory;

  @ApiProperty({ enum: Unit, description: 'Unidade de medida', example: Unit.UN })
  unit!: Unit;
}

export class StockMovementWorkOrderCustomerDto implements StockWorkOrderCustomerResponse {
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

export class StockMovementWorkOrderVehicleDto implements StockWorkOrderVehicleResponse {
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
  color!: string | null;
}

export class StockMovementWorkOrderAssignedUserDto implements StockWorkOrderAssignedUserResponse {
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

  @ApiProperty({
    enum: UserRole,
    description: 'Perfil de acesso',
    example: UserRole.MECHANIC,
    nullable: true,
  })
  role!: UserRole | null;
}

export class StockMovementWorkOrderDto implements StockWorkOrderResponse {
  @ApiProperty({
    description: 'ID único da Ordem de Serviço',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ description: 'Número sequencial da Ordem de Serviço', example: '000042' })
  number!: string;

  @ApiPropertyOptional({
    type: StockMovementWorkOrderCustomerDto,
    description: 'Dados do Cliente',
  })
  customer!: StockMovementWorkOrderCustomerDto;

  @ApiPropertyOptional({
    type: StockMovementWorkOrderVehicleDto,
    description: 'Dados do Veículo',
  })
  vehicle!: StockMovementWorkOrderVehicleDto;

  @ApiPropertyOptional({
    type: StockMovementWorkOrderAssignedUserDto,
    description: 'Mecânico responsável',
    nullable: true,
  })
  assignedUser!: StockMovementWorkOrderAssignedUserDto | null;
}

export class StockMovementResponseDto implements StockMovementResponse {
  @ApiProperty({
    description: 'ID único da Movimentação de Estoque',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ type: StockMovementPartSupplyDto, description: 'Peça ou Insumo movimentado' })
  partSupply!: StockMovementPartSupplyDto;

  @ApiPropertyOptional({
    type: StockMovementWorkOrderDto,
    description: 'Ordem de Serviço vinculada à saída (somente em EXIT)',
    nullable: true,
  })
  workOrder!: StockMovementWorkOrderDto | null;

  @ApiProperty({
    enum: StockMovementType,
    description: 'Tipo da movimentação: ENTRY (entrada), EXIT (saída), ADJUSTMENT (ajuste)',
    example: StockMovementType.ENTRY,
  })
  type!: StockMovementType;

  @ApiProperty({ description: 'Quantidade movimentada', example: 5 })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Motivo da movimentação',
    example: 'Reposição de estoque',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    description: 'Data/hora da movimentação',
    example: '2026-04-21T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;
}

export class StockMovementDataResponseDto {
  @ApiProperty({ type: StockMovementResponseDto, description: 'Dados da Movimentação de Estoque' })
  data!: StockMovementResponseDto;
}

export class StockMovementPaginatedResponseDto
  extends PaginatedResponseDto<StockMovementResponseDto>
  implements StockMovementPaginatedResponse
{
  @ApiProperty({ type: [StockMovementResponseDto], description: 'Movimentações da página atual' })
  data!: StockMovementResponseDto[];
}
