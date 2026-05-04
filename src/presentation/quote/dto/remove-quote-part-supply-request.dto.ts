import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RemoveQuotePartSupplyRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  partSupplyId!: string;
}
