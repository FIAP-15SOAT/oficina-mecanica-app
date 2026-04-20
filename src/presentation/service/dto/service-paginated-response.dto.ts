import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto } from './service-response.dto';

export class ServicePaginatedResponseDto {
  @ApiProperty({
    type: [ServiceResponseDto],
    description: 'Serviços da página atual',
  })
  data!: ServiceResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de registros encontrados' })
  totalRecords!: number;

  @ApiProperty({ example: 5, description: 'Total de paginas disponiveis' })
  totalPages!: number;
}
