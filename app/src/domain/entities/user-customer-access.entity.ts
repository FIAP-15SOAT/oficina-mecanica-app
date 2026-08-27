import { randomUUID } from 'node:crypto';
import { DomainValidationException } from '../exceptions/domain-validation.exception';
import { AccessRelationship } from '../enums/access-relationship.enum';

const VALID_RELATIONSHIPS = Object.values(AccessRelationship);

export interface CreateUserCustomerAccessProps {
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
}

interface UserCustomerAccessProps extends CreateUserCustomerAccessProps {
  id: string;
  createdAt: Date;
}

export class UserCustomerAccess {
  readonly id: string;
  readonly userId: string;
  readonly customerId: string;
  readonly relationship: AccessRelationship;
  readonly createdAt: Date;

  private constructor(props: UserCustomerAccessProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.customerId = props.customerId;
    this.relationship = props.relationship;
    this.createdAt = props.createdAt;
  }

  static reconstitute(props: UserCustomerAccessProps): UserCustomerAccess {
    return new UserCustomerAccess(props);
  }

  static create(props: CreateUserCustomerAccessProps): UserCustomerAccess {
    UserCustomerAccess.validateRelationship(props.relationship);

    return new UserCustomerAccess({
      id: randomUUID(),
      userId: props.userId,
      customerId: props.customerId,
      relationship: props.relationship,
      createdAt: new Date(),
    });
  }

  private static validateRelationship(relationship: AccessRelationship): void {
    if (!VALID_RELATIONSHIPS.includes(relationship)) {
      throw new DomainValidationException(
        `Relacionamento inválido. Valores aceitos: ${VALID_RELATIONSHIPS.join(', ')}`,
      );
    }
  }
}
