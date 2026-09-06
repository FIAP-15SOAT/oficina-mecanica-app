import { UserPublicView } from '@domain/entities/user.entity';
import { LinkedCustomerOutputDto } from '@application/ports/input/customer-access/dto/list-user-customers.dto';

export interface GrantCustomerAccessDto {
  name?: string;
  email?: string;
  cpf?: string;
}

export interface GrantCustomerAccessOutputDto {
  user: UserPublicView;
  customer: LinkedCustomerOutputDto;
  initialPasswordSent: boolean;
}
