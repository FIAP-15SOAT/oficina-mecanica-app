export interface IFindAccessibleCustomerIdsForUserUseCase {
  execute(userId: string): Promise<string[]>;
}
