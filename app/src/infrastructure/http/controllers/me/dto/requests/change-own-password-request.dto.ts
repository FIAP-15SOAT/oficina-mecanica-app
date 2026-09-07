import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangeOwnPasswordRequestDto {
  @ApiProperty({ example: 'Senha@123', description: 'Senha atual' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @MinLength(1, { message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha@123', description: 'Nova senha' })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  newPassword!: string;
}
