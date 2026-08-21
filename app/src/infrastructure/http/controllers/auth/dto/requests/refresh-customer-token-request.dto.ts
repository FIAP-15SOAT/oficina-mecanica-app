import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshCustomerTokenRequestDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'O refresh token deve ser um texto.' })
  @IsNotEmpty({ message: 'O refresh token é obrigatório.' })
  refreshToken!: string;
}
