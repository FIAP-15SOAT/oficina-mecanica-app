import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CustomerSummaryResponse,
  VehicleDataResponse,
  VehicleResponse,
} from '@interface-adapters/vehicle/responses/vehicle.response';

export class CustomerSummaryResponseDto implements CustomerSummaryResponse {
  @ApiProperty({ description: 'ID do Cliente', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Nome do Cliente', example: 'João da Silva' })
  name!: string;

  @ApiProperty({ description: 'CPF ou CNPJ', example: '123.456.789-09' })
  document!: string;
}

export class VehicleResponseDto implements VehicleResponse {
  @ApiProperty({ description: 'ID único do Veículo', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'ID do Cliente proprietário', format: 'uuid' })
  customerId!: string;

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

  @ApiPropertyOptional({ description: 'Quilometragem', example: 50000, nullable: true })
  mileage!: number | null;

  @ApiProperty({ type: CustomerSummaryResponseDto, description: 'Dados resumidos do cliente' })
  customer!: CustomerSummaryResponseDto;

  @ApiProperty({
    description: 'Data de cadastro',
    example: '2026-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2026-04-21T08:00:00.000Z',
    format: 'date-time',
  })
  updatedAt!: Date;
}

export class VehicleDataResponseDto implements VehicleDataResponse {
  @ApiProperty({ type: VehicleResponseDto })
  data!: VehicleResponseDto;
}
