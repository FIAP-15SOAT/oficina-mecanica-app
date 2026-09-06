import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ConfirmPasswordResetRequestDto {
  @ApiProperty({ example: 'joao@email.com', description: 'E-mail cadastrado' })
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @ApiProperty({
    example: '042731',
    description: 'Código numérico de 6 dígitos enviado por e-mail',
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NovaSenha@123', description: 'Nova senha, com no mínimo 8 caracteres' })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @MinLength(8)
  newPassword!: string;
}
