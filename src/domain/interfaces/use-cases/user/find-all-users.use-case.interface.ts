import { UserPublicView } from '@domain/entities/user.entity';
import { PaginatedResult } from '../../common/pagination.interface';
import { FindAllUsersPaginatedInput } from './dto/find-all-users-paginated.dto';

export interface IFindAllUsersUseCase {
  execute(input: FindAllUsersPaginatedInput): Promise<PaginatedResult<UserPublicView>>;
}
