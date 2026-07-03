import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import { VehiclePaginatedResponse } from '@interface-adapters/vehicle/responses/vehicle.response';

export class VehiclePaginatedResponseDto
  extends PaginatedResponseDto<VehicleResponseDto>
  implements VehiclePaginatedResponse
{
  @ApiProperty({ type: [VehicleResponseDto], description: 'Veículos da página atual' })
  data!: VehicleResponseDto[];
}
