import { UserPublicView } from '@domain/entities/user.entity';

export interface IListCustomerAccessUsersUseCase {
  execute(customerId: string): Promise<UserPublicView[]>;
}
