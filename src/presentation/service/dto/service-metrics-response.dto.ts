import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@presentation/common/dto/paginated-response.dto';

export class ServiceMetricsResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  serviceId!: string;

  @ApiProperty({ example: 'Troca de óleo' })
  serviceName!: string;

  @ApiProperty({ example: 10 })
  executionCount!: number;

  @ApiProperty({ example: 45, nullable: true })
  averageTimeMinutes!: number | null;
}

export class ServiceMetricsDataResponseDto {
  @ApiProperty({ type: ServiceMetricsResponseDto })
  data!: ServiceMetricsResponseDto;
}

export class ServiceMetricsPaginatedResponseDto extends PaginatedResponseDto<ServiceMetricsResponseDto> {
  @ApiProperty({ type: [ServiceMetricsResponseDto] })
  data!: ServiceMetricsResponseDto[];
}
