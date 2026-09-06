export interface IUpdateCustomerStatusUseCase {
  execute(customerId: string, isActive: boolean, actingUserId: string): Promise<void>;
}
