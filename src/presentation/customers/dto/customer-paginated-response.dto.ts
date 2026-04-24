import { ApiProperty } from '@nestjs/swagger';
import { CustomerResponseDto } from './customer-response.dto';

export class CustomerPaginationDto {
  @ApiProperty({ example: 42, description: 'Total de registros encontrados' })
  totalRecords!: number;

  @ApiProperty({ example: 5, description: 'Total de páginas disponíveis' })
  totalPages!: number;

  @ApiProperty({ example: 1, description: 'Página atual' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Itens por página' })
  limit!: number;
}

export class CustomerPaginatedResponseDto {
  @ApiProperty({ type: [CustomerResponseDto], description: 'Clientes da página atual' })
  data!: CustomerResponseDto[];

  @ApiProperty({ type: CustomerPaginationDto, description: 'Informações de paginação' })
  pagination!: CustomerPaginationDto;
}
