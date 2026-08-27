import { AccessRelationship } from '@domain/enums/access-relationship.enum';

export interface UserCustomerAccessResponse {
  id: string;
  userId: string;
  customerId: string;
  relationship: AccessRelationship;
  createdAt: Date;
}

export interface UserCustomerAccessDataResponse {
  data: UserCustomerAccessResponse;
}
