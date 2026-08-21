import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { PASSWORD_REGEX } from '@domain/constants/regex/password.regex';
import { PASSWORD_REQUIREMENTS_MESSAGE } from '@domain/constants/validation/password.constants';

export class ChangeOwnCustomerPasswordRequestDto {
  @ApiProperty({ example: 'SenhaAtual@123', description: 'Senha atual' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NovaSenha@456',
    description:
      'Nova senha (mín. 8 caracteres, com ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial)',
  })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  newPassword!: string;
}
