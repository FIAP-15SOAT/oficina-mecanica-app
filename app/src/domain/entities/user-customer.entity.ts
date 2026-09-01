import { DomainValidationException } from '../exceptions/domain-validation.exception';

export interface CreateUserCustomerProps {
  userId: string;
  customerId: string;
}

interface UserCustomerProps {
  userId: string;
  customerId: string;
  createdAt: Date;
}

export class UserCustomer {
  readonly userId: string;
  readonly customerId: string;
  readonly createdAt: Date;

  private constructor(props: UserCustomerProps) {
    this.userId = props.userId;
    this.customerId = props.customerId;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: UserCustomerProps): UserCustomer {
    return new UserCustomer(props);
  }

  static create(props: CreateUserCustomerProps): UserCustomer {
    if (!props.userId?.trim()) {
      throw new DomainValidationException('ID do usuário é obrigatório');
    }

    if (!props.customerId?.trim()) {
      throw new DomainValidationException('ID do cliente é obrigatório');
    }

    return new UserCustomer({
      userId: props.userId,
      customerId: props.customerId,
      createdAt: new Date(),
    });
  }
}
