import { UserPublicView } from '@domain/entities/user.entity';
import { PaginatedResult } from '@domain/interfaces/common/pagination.interface';
import { UserPaginatedResponseDto, UserDataResponseDto } from './dto/user-response.dto';

export class UserPresenter {
  static toPaginatedResponse(result: PaginatedResult<UserPublicView>): UserPaginatedResponseDto {
    return {
      data: result.items,
      pagination: result.pagination,
    };
  }

  static toDataResponse(user: UserPublicView): UserDataResponseDto {
    return {
      data: user,
    };
  }
}
