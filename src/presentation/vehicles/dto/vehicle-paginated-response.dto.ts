import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';

export class VehiclePaginatedResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] })
  data: VehicleResponseDto[];

  @ApiProperty({ example: 42 })
  totalRecords: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
