import { FindAllCustomersInputDto, FindAllCustomersOutputDto } from './dto/find-all-customers.dto';

export interface IFindAllCustomersUseCase {
  execute(input: FindAllCustomersInputDto): Promise<FindAllCustomersOutputDto>;
}
