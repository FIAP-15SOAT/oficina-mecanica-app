import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangeOwnPasswordRequestDto {
  @ApiProperty({ description: 'Senha atual' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ description: 'Nova senha' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
