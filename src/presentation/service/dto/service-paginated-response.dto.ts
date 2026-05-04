import { ApiProperty } from '@nestjs/swagger';
import { ServiceResponseDto } from './service-response.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

export class ServicePaginatedResponseDto extends PaginatedResponseDto<ServiceResponseDto> {
  @ApiProperty({
    type: [ServiceResponseDto],
    description: 'Serviços da página atual',
  })
  data!: ServiceResponseDto[];
}
