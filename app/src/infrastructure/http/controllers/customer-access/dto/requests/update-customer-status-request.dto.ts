import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCustomerStatusRequestDto {
  @ApiProperty({ description: 'Novo estado ativo do cliente' })
  @IsBoolean()
  isActive!: boolean;
}
