import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerSummaryDto {
  @ApiProperty({ description: 'ID do Cliente', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Nome do Cliente', example: 'João da Silva' })
  name: string;

  @ApiProperty({ description: 'CPF ou CNPJ', example: '123.456.789-09' })
  document: string;
}

export class VehicleResponseDto {
  @ApiProperty({ description: 'ID único do Veículo', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'ID do Cliente proprietário', format: 'uuid' })
  customerId: string;

  @ApiProperty({ description: 'Placa do veículo', example: 'ABC-1234' })
  plate: string;

  @ApiProperty({ description: 'Marca', example: 'Toyota' })
  brand: string;

  @ApiProperty({ description: 'Modelo', example: 'Corolla' })
  model: string;

  @ApiProperty({ description: 'Ano de fabricação', example: 2020 })
  year: number;

  @ApiPropertyOptional({ description: 'Cor', example: 'Prata', nullable: true })
  color: string | null;

  @ApiPropertyOptional({ description: 'Quilometragem', example: 50000, nullable: true })
  mileage: number | null;

  @ApiProperty({ type: CustomerSummaryDto, description: 'Dados resumidos do cliente' })
  customer: CustomerSummaryDto;

  @ApiProperty({ description: 'Data de cadastro' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  updatedAt: Date;
}

export class VehicleDataResponseDto {
  @ApiProperty({ type: VehicleResponseDto })
  data: VehicleResponseDto;
}
