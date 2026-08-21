import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ICustomerRepository } from '@domain/interfaces/repositories/customer.repository.interface';
import { CustomerTokenPayload } from '@application/ports/output/token.service.interface';

@Injectable()
export class JwtCustomerStrategy extends PassportStrategy(Strategy, 'jwt-customer') {
  constructor(
    configService: ConfigService,
    @Inject('ICustomerRepository')
    private readonly customerRepository: ICustomerRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('CUSTOMER_JWT_SECRET'),
    });
  }

  async validate(payload: CustomerTokenPayload): Promise<CustomerTokenPayload> {
    const customer = await this.customerRepository.findById(payload.sub);

    if (!customer) {
      throw new UnauthorizedException('Cliente inválido');
    }

    return { sub: customer.id, email: customer.email.value, type: 'customer' };
  }
}
