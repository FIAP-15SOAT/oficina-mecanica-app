import { calculateTotalPages } from '@application/utils/calculate-total-pages.util';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import {
  FindAllCustomersInputDto,
  FindAllCustomersOutputDto,
} from '@domain/interfaces/use-cases/customer/dto/find-all-customers.dto';
import { IFindAllCustomersUseCase } from '@domain/interfaces/use-cases/customer/find-all-customers.use-case.interface';

export class FindAllCustomersUseCase implements IFindAllCustomersUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(input: FindAllCustomersInputDto): Promise<FindAllCustomersOutputDto> {
    const { items, total } = await this.customerRepository.findAll(input);
    return {
      items,
      totalRecords: total,
      totalPages: calculateTotalPages(total, input.limit),
      page: input.page,
      limit: input.limit,
    };
  }
}
