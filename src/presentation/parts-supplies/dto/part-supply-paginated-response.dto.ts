import { ApiProperty } from '@nestjs/swagger';
import { PartSupplyResponseDto } from './part-supply-response.dto';

export class PartSupplyPaginatedResponseDto {
  @ApiProperty({ type: [PartSupplyResponseDto], description: 'Peças e Insumos da página atual' })
  data: PartSupplyResponseDto[];

  @ApiProperty({ example: 42, description: 'Total de registros encontrados' })
  totalRecords: number;

  @ApiProperty({ example: 5, description: 'Total de páginas disponíveis' })
  totalPages: number;

  @ApiProperty({ example: 1, description: 'Página atual' })
  page: number;

  @ApiProperty({ example: 10, description: 'Itens por página' })
  limit: number;
}
