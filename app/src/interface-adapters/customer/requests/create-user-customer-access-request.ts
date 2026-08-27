import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface CreateUserCustomerAccessRequest {
  userId: string;
  relationship: AccessRelationship;
}
