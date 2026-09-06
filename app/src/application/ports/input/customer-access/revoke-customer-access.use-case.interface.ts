export interface IRevokeCustomerAccessUseCase {
  execute(customerId: string, userId: string, actingUserId: string): Promise<void>;
}
