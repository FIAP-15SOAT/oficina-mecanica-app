import { Customer } from '@domain/entities/customer.entity';
import { Document } from '@domain/value-objects/document.vo';

import { IHashService } from '@application/ports/output/hash.service.interface';
import { ITokenService } from '@application/ports/output/token.service.interface';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import {
  AuthenticateCustomerInputDto,
  AuthenticateCustomerOutputDto,
} from '@application/ports/input/auth/dto/authenticate-customer.dto';
import { IAuthenticateCustomerUseCase } from '@application/ports/input/auth/authenticate-customer.use-case.interface';

import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';

export class AuthenticateCustomerUseCase implements IAuthenticateCustomerUseCase {
  constructor(
    private readonly customerRepository: ICustomerRepository,
    private readonly hashService: IHashService,
    private readonly tokenService: ITokenService,
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshExpiresIn: string,
  ) {}

  async execute(input: AuthenticateCustomerInputDto): Promise<AuthenticateCustomerOutputDto> {
    const customer = await this.findCustomerByIdentifier(input.identifier);

    if (!customer) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const passwordMatches = await this.hashService.compare(input.password, customer.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedAccessException('Credenciais inválidas');
    }

    const payload = { sub: customer.id, email: customer.email.value, type: 'customer' as const };

    const accessToken = this.tokenService.signWithSecret(
      payload,
      this.accessSecret,
      this.accessExpiresIn,
    );
    const refreshToken = this.tokenService.signWithSecret(
      payload,
      this.refreshSecret,
      this.refreshExpiresIn,
    );

    return {
      accessToken,
      refreshToken,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email.value,
        document: customer.document.value,
        type: customer.type,
      },
    };
  }

  private async findCustomerByIdentifier(identifier: string): Promise<Customer | null> {
    if (identifier.includes('@')) {
      return this.customerRepository.findByEmail(identifier);
    }

    return this.customerRepository.findByDocument(Document.sanitize(identifier));
  }
}
