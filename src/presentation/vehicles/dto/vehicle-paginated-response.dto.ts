import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';

export class VehiclePaginationDto {
  @ApiProperty({ example: 42, description: 'Total de registros encontrados' })
  totalRecords!: number;

  @ApiProperty({ example: 5, description: 'Total de páginas disponíveis' })
  totalPages!: number;

  @ApiProperty({ example: 1, description: 'Página atual' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Itens por página' })
  limit!: number;
}

export class VehiclePaginatedResponseDto {
  @ApiProperty({ type: [VehicleResponseDto], description: 'Veículos da página atual' })
  data!: VehicleResponseDto[];

  @ApiProperty({ type: VehiclePaginationDto, description: 'Informações de paginação' })
  pagination!: VehiclePaginationDto;
}
