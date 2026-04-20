import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador unico do servico',
  })
  id!: string;

  @ApiProperty({ example: 'Troca de óleo', description: 'Nome do servico' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Troca de óleo com filtro',
    description: 'Descricao opcional do servico',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({ example: 129.9, description: 'Preco base do servico' })
  basePrice!: number;

  @ApiProperty({ example: 60, description: 'Tempo estimado em minutos' })
  estimatedTimeMin!: number;

  @ApiProperty({ example: true, description: 'Indica se o servico esta ativo' })
  isActive!: boolean;

  @ApiProperty({ description: 'Data de criacao do servico' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da ultima atualizacao do servico' })
  updatedAt!: Date;
}
