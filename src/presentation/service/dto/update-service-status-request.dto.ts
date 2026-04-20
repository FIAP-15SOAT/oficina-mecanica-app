import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateServiceStatusRequestDto {
  @ApiProperty({
    example: true,
    description: 'Indica o status de atividade do serviço',
  })
  @IsBoolean({ message: 'active deve ser um booleano' })
  active!: boolean;
}
