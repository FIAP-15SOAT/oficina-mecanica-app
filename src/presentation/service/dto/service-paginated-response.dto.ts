import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto } from './service-response.dto';

export class ServicePaginationDto {
  @ApiProperty({ example: 42, description: 'Total de registros encontrados' })
  totalRecords!: number;

  @ApiProperty({ example: 5, description: 'Total de páginas disponíveis' })
  totalPages!: number;

  @ApiProperty({ example: 1, description: 'Página atual' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Itens por página' })
  limit!: number;
}

export class ServicePaginatedResponseDto {
  @ApiProperty({
    type: [ServiceResponseDto],
    description: 'Serviços da página atual',
  })
  data!: ServiceResponseDto[];

  @ApiProperty({ type: ServicePaginationDto, description: 'Informações de paginação' })
  pagination!: ServicePaginationDto;
}
