import { Customer } from '@domain/entities/customer.entity';
import { UserPublicView } from '@domain/entities/user.entity';

export interface FindUserByIdOutput extends UserPublicView {
  customers: Customer[];
}

export interface IFindUserByIdUseCase {
  execute(id: string): Promise<FindUserByIdOutput>;
}
