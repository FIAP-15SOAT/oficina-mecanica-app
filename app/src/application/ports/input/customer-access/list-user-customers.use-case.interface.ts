import { LinkedCustomerOutputDto } from './dto/list-user-customers.dto';

export interface IListUserCustomersUseCase {
  execute(userId: string): Promise<LinkedCustomerOutputDto[]>;
}
