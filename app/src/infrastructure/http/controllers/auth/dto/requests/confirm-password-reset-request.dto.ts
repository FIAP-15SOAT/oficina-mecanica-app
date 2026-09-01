import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ConfirmPasswordResetRequestDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '042731' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
