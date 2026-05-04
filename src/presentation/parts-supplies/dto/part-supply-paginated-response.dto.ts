import { ApiProperty } from '@nestjs/swagger';
import { PartSupplyResponseDto } from './part-supply-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export class PartSupplyPaginatedResponseDto extends PaginatedResponseDto<PartSupplyResponseDto> {
  @ApiProperty({ type: [PartSupplyResponseDto], description: 'Peças e Insumos da página atual' })
  data!: PartSupplyResponseDto[];
}
