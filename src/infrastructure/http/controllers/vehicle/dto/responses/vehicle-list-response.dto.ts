import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';
import { VehicleListResponse } from '@interface-adapters/vehicle/responses/vehicle.response';

export class VehicleListResponseDto implements VehicleListResponse {
  @ApiProperty({ type: [VehicleResponseDto], description: 'Veículos do cliente' })
  data!: VehicleResponseDto[];
}
