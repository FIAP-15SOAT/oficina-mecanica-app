import {
  RefreshCustomerTokenInputDto,
  RefreshCustomerTokenOutputDto,
} from '@application/ports/input/auth/dto/refresh-customer-token.dto';

export interface IRefreshCustomerTokenUseCase {
  execute(input: RefreshCustomerTokenInputDto): Promise<RefreshCustomerTokenOutputDto>;
}
