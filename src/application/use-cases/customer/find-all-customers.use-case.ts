import { Customer } from '@domain/entities/customer.entity';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { FindAllCustomersInputDto } from '@application/ports/input/customer/dto/find-all-customers.dto';
import { IFindAllCustomersUseCase } from '@application/ports/input/customer/find-all-customers.use-case.interface';
import { PaginatedResult, PaginationInput } from '@domain/interfaces/common/pagination.interface';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllCustomersUseCase implements IFindAllCustomersUseCase {
  constructor(private readonly customerRepository: ICustomerRepository) {}

  async execute(input: FindAllCustomersInputDto): Promise<PaginatedResult<Customer>> {
    const { page, limit, ...filters } = input;
    const pagination: PaginationInput = { page, limit };

    const result = await this.customerRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(result, pagination);
  }
}
