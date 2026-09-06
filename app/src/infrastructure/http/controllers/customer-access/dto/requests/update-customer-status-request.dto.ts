import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCustomerStatusRequestDto {
  @ApiProperty({
    example: true,
    description: 'Novo estado ativo do cliente',
  })
  @IsBoolean({ message: 'isActive deve ser um booleano' })
  isActive!: boolean;
}
