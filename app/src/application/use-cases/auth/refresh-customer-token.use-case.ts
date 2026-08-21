import {
  ITokenService,
  CustomerTokenPayload,
} from '@application/ports/output/token.service.interface';
import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';

import {
  RefreshCustomerTokenInputDto,
  RefreshCustomerTokenOutputDto,
} from '@application/ports/input/auth/dto/refresh-customer-token.dto';
import { IRefreshCustomerTokenUseCase } from '@application/ports/input/auth/refresh-customer-token.use-case.interface';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class RefreshCustomerTokenUseCase implements IRefreshCustomerTokenUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly tokenService: ITokenService,
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  async execute(input: RefreshCustomerTokenInputDto): Promise<RefreshCustomerTokenOutputDto> {
    let payload: CustomerTokenPayload;

    try {
      payload = this.tokenService.verifyWithSecret<CustomerTokenPayload>(
        input.refreshToken,
        this.refreshSecret,
      );
    } catch {
      throw new UnauthorizedAccessException('Refresh token inválido ou expirado');
    }

    const customer = await this.customerRepository.findById(payload.sub);

    if (!customer) {
      throw new UnauthorizedAccessException('Refresh token inválido ou expirado');
    }

    const newPayload = { sub: customer.id, email: customer.email.value, type: 'customer' as const };

    return {
      accessToken: this.tokenService.signWithSecret(
        newPayload,
        this.accessSecret,
        this.accessExpiresIn,
      ),
      refreshToken: this.tokenService.signWithSecret(
        newPayload,
        this.refreshSecret,
        this.refreshExpiresIn,
      ),
    };
  }
}
