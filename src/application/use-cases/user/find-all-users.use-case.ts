import { UserPublicView } from '@domain/entities/user.entity';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { IFindAllUsersUseCase } from '@domain/interfaces/use-cases/user/find-all-users.use-case.interface';
import { FindAllUsersPaginatedInput } from '@domain/interfaces/use-cases/user/dto/find-all-users-paginated.dto';
import { buildPaginatedResult } from '@application/utils/pagination.util';

export class FindAllUsersUseCase implements IFindAllUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: FindAllUsersPaginatedInput): Promise<PaginatedResult<UserPublicView>> {
    const { page, limit, ...filters } = input;
    const pagination = { page, limit };

    const result = await this.userRepository.findAllPaginated(pagination, filters);

    return buildPaginatedResult(
      {
        items: result.items.map((user) => user.toPublicView()),
        total: result.total,
      },
      pagination,
    );
  }
}
