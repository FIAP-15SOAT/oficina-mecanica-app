import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkOrderStatus } from '@domain/enums/work-order-status.enum';
import { PaginatedResponseDto } from '@infrastructure/http/common/dto/paginated-response.dto';
import {
  MyWorkOrderResponse,
  MyWorkOrderDataResponse,
  MyWorkOrderPaginatedResponse,
  MyVehicleSummary,
} from '@interface-adapters/me/responses/me.response';

export class MyVehicleSummaryDto implements MyVehicleSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  plate!: string;

  @ApiProperty()
  brand!: string;

  @ApiProperty()
  model!: string;
}

export class MyWorkOrderResponseDto implements MyWorkOrderResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  number!: string;

  @ApiProperty({ enum: WorkOrderStatus })
  status!: WorkOrderStatus;

  @ApiPropertyOptional({ nullable: true })
  problemDescription!: string | null;

  @ApiPropertyOptional({ nullable: true })
  mileageAtService!: number | null;

  @ApiPropertyOptional({ type: MyVehicleSummaryDto, nullable: true })
  vehicle!: MyVehicleSummaryDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class MyWorkOrderDataResponseDto implements MyWorkOrderDataResponse {
  @ApiProperty({ type: MyWorkOrderResponseDto })
  data!: MyWorkOrderResponseDto;
}

export class MyWorkOrderPaginatedResponseDto
  extends PaginatedResponseDto<MyWorkOrderResponseDto>
  implements MyWorkOrderPaginatedResponse
{
  @ApiProperty({ type: [MyWorkOrderResponseDto] })
  data!: MyWorkOrderResponseDto[];
}
