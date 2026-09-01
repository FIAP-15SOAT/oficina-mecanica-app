import { defineLogEvent } from './log-event';

export type AuthenticationFailureReason = 'unknown_user' | 'inactive_user' | 'wrong_password';

export type RefreshFailureReason = 'invalid_token' | 'unknown_user' | 'inactive_user';

export type QuoteDecisionFailureReason =
  | 'invalid_token'
  | 'token_type_mismatch'
  | 'quote_id_mismatch';

interface AuthenticatedSubjectFields {
  subjectId: string;
  subjectName: string;
  subjectEmail: string;
}

export const BUSINESS_EVENTS = {
  AUTHENTICATION_SUCCEEDED: defineLogEvent<AuthenticatedSubjectFields>({
    name: 'auth.authentication.succeeded',
    message: 'credentials accepted and token pair issued',
    level: 'info',
  }),
  AUTHENTICATION_FAILED: defineLogEvent<
    Partial<AuthenticatedSubjectFields> & { failureReason: AuthenticationFailureReason }
  >({
    name: 'auth.authentication.failed',
    message: 'credentials rejected',
    level: 'warn',
  }),
  REFRESH_TOKEN_FAILED: defineLogEvent<
    Partial<AuthenticatedSubjectFields> & { failureReason: RefreshFailureReason }
  >({
    name: 'auth.refresh.failed',
    message: 'refresh token rejected',
    level: 'warn',
  }),
  QUOTE_DECISION_TOKEN_REJECTED: defineLogEvent<{
    quoteDecisionFailureReason: QuoteDecisionFailureReason;
    quoteId: string;
  }>({
    name: 'quote.decision.token_rejected',
    message: 'quote decision capability token rejected',
    level: 'warn',
  }),
  QUOTE_SUBMITTED: defineLogEvent<{
    quoteId: string;
    previousQuoteStatus: string;
    workOrderId: string;
    workOrderNumber: string;
  }>({
    name: 'quote.submitted',
    message: 'quote submitted to the customer for decision',
    level: 'info',
  }),
  QUOTE_APPROVED: defineLogEvent<{
    quoteId: string;
    previousQuoteStatus: string;
    workOrderId: string;
    workOrderNumber: string;
    previousWorkOrderStatus: string;
  }>({
    name: 'quote.approved',
    message: 'quote approved and work order items applied',
    level: 'info',
  }),
  QUOTE_REJECTED: defineLogEvent<{
    quoteId: string;
    previousQuoteStatus: string;
    workOrderId: string;
    workOrderNumber: string;
    previousWorkOrderStatus?: string;
    workOrderStatusChanged: boolean;
  }>({
    name: 'quote.rejected',
    message: 'quote rejected by customer decision',
    level: 'info',
  }),
  STOCK_RESERVED: defineLogEvent<{
    quoteId: string;
    workOrderId: string;
    workOrderNumber: string;
    reservedItemCount: number;
    reservedQuantity: number;
  }>({
    name: 'stock.reserved',
    message: 'stock reserved for the approved work order',
    level: 'info',
  }),
  STOCK_CONSUMED: defineLogEvent<{
    workOrderId: string;
    workOrderNumber: string;
    consumedItemCount: number;
    consumedQuantity: number;
  }>({
    name: 'stock.consumed',
    message: 'reserved stock consumed as the work order started',
    level: 'info',
  }),
  WORK_ORDER_STATUS_UPDATED: defineLogEvent<{
    workOrderId: string;
    workOrderNumber: string;
    previousWorkOrderStatus: string;
    currentWorkOrderStatus: string;
  }>({
    name: 'work_order.status.updated',
    message: 'work order moved to a new status',
    level: 'info',
  }),
  WORK_ORDER_SERVICE_STATUS_UPDATED: defineLogEvent<{
    workOrderId: string;
    workOrderNumber: string;
    workOrderServiceId: string;
    workOrderServiceName?: string;
    previousWorkOrderServiceStatus?: string;
    currentWorkOrderServiceStatus: string;
    previousWorkOrderStatus: string;
    currentWorkOrderStatus: string;
  }>({
    name: 'work_order.service.status.updated',
    message: 'work order service item moved to a new status',
    level: 'info',
  }),
  STOCK_UPDATED: defineLogEvent<{
    partSupplyId: string;
    partSupplyName: string;
    movementType: string;
    movementQuantity: number;
    currentQuantity: number;
    workOrderId?: string;
  }>({
    name: 'stock.updated',
    message: 'stock movement applied to a part or supply',
    level: 'info',
  }),
  USER_STATUS_UPDATED: defineLogEvent<{ targetUserId: string; targetUserActive: boolean }>({
    name: 'user.status.updated',
    message: 'user account activation changed',
    level: 'info',
  }),
  CUSTOMER_ACCESS_GRANTED: defineLogEvent<{
    subjectId: string;
    targetUserId: string;
    customerId: string;
    accessUserCreated: boolean;
    initialPasswordSent: boolean;
  }>({
    name: 'customer.access.granted',
    message: 'customer access granted to a user',
    level: 'info',
  }),
  CUSTOMER_ACCESS_REVOKED: defineLogEvent<{
    subjectId: string;
    targetUserId: string;
    customerId: string;
  }>({
    name: 'customer.access.revoked',
    message: 'customer access revoked from a user',
    level: 'info',
  }),
  CUSTOMER_STATUS_UPDATED: defineLogEvent<{
    subjectId: string;
    customerId: string;
    customerActive: boolean;
  }>({
    name: 'customer.status.updated',
    message: 'customer active flag changed',
    level: 'info',
  }),
  PORTAL_ACCESS_DENIED: defineLogEvent<{
    subjectId: string;
    customerId: string;
    externalAccessFailureReason: string;
  }>({
    name: 'portal.access.denied',
    message: 'external principal denied access to a customer-scoped resource',
    level: 'warn',
  }),
} as const;
