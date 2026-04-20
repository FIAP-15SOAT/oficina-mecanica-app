import { ApiProperty } from '@nestjs/swagger';
import { PartSupplyResponseDto } from './part-supply-response.dto';

export class PartSupplyDataResponseDto {
  @ApiProperty({ type: PartSupplyResponseDto })
  data: PartSupplyResponseDto;
}

export class PartSupplyListResponseDto {
  @ApiProperty({ type: [PartSupplyResponseDto] })
  data: PartSupplyResponseDto[];
}

export class PartSupplyPaginatedResponseDto {
  @ApiProperty({ type: [PartSupplyResponseDto] })
  data: PartSupplyResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
