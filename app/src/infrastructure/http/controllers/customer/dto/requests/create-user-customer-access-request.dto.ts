import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export class CreateUserCustomerAccessRequestDto {
  @ApiProperty({
    description: 'ID do usuário (deve ter role CUSTOMER) a vincular a este cliente',
    format: 'uuid',
  })
  @IsUUID(undefined, { message: 'O ID do usuário deve ser um UUID válido.' })
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório.' })
  userId!: string;

  @ApiProperty({
    enum: AccessRelationship,
    description:
      'SELF: o usuário é a própria pessoa física titular deste cliente (documentos devem coincidir). ' +
      'REPRESENTATIVE: o usuário representa este cliente (pessoa jurídica).',
    example: AccessRelationship.SELF,
  })
  @IsEnum(AccessRelationship, { message: 'O relacionamento deve ser SELF ou REPRESENTATIVE.' })
  @IsNotEmpty({ message: 'O relacionamento é obrigatório.' })
  relationship!: AccessRelationship;
}
