import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RemoveQuoteServiceRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId!: string;
}
