import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum UpdateQuoteStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateQuoteStatusRequestDto {
  @ApiProperty({
    description: 'Novo status do orçamento',
    enum: UpdateQuoteStatus,
    example: UpdateQuoteStatus.APPROVED,
  })
  @IsEnum(UpdateQuoteStatus, { message: 'O status deve ser APPROVED ou REJECTED' })
  @IsNotEmpty({ message: 'O status é obrigatório' })
  status: UpdateQuoteStatus;

  @ApiPropertyOptional({
    description: 'Motivo da rejeição (obrigatório se o status for REJECTED)',
    example: 'Preço acima do esperado',
  })
  @IsString({ message: 'O motivo deve ser um texto' })
  @IsOptional()
  reason?: string;
}
