import { UserCustomerAccess } from '@domain/entities/user-customer-access.entity';
import { CreateUserCustomerAccessDto } from './dto/create-user-customer-access.dto';

export interface ICreateUserCustomerAccessUseCase {
  execute(input: CreateUserCustomerAccessDto): Promise<UserCustomerAccess>;
}
