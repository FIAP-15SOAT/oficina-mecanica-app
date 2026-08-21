import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginCustomerRequestDto {
  @ApiProperty({ example: 'cliente@email.com', description: 'E-mail ou CPF/CNPJ cadastrado' })
  @IsString({ message: 'O identificador deve ser um texto.' })
  @IsNotEmpty({ message: 'O e-mail ou documento é obrigatório' })
  identifier!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha do cliente' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  password!: string;
}
