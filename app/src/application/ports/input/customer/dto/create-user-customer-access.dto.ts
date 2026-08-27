import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface CreateUserCustomerAccessDto {
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
}
