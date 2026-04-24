import { ApiProperty } from '@nestjs/swagger';
import { CustomerType } from '@domain/enums/customer-type.enum';

export class CustomerResponseDto {
  @ApiProperty({ description: 'ID único do Cliente', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ description: 'Nome do Cliente', example: 'João da Silva' })
  name: string;

  @ApiProperty({ description: 'CPF ou CNPJ', example: '123.456.789-09' })
  document: string;

  @ApiProperty({ enum: CustomerType, description: 'Tipo de pessoa', example: CustomerType.INDIVIDUAL })
  type: CustomerType;

  @ApiProperty({ description: 'E-mail', example: 'joao@email.com' })
  email: string;

  @ApiProperty({ description: 'Telefone', example: '(11) 99999-9999' })
  phone: string;

  @ApiProperty({ description: 'Data de cadastro', example: '2026-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Data da última atualização', example: '2026-04-21T08:00:00.000Z' })
  updatedAt: Date;
}

export class CustomerDataResponseDto {
  @ApiProperty({ type: CustomerResponseDto })
  data: CustomerResponseDto;
}
