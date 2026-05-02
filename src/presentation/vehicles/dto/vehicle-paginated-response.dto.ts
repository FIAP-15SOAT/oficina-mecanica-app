import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export class VehiclePaginatedResponseDto extends PaginatedResponseDto<VehicleResponseDto> {
  @ApiProperty({ type: [VehicleResponseDto], description: 'Veículos da página atual' })
  data!: VehicleResponseDto[];
}
