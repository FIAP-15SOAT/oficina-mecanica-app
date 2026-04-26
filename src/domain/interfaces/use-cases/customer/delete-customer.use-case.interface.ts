export interface IDeleteCustomerUseCase {
  execute(id: string): Promise<void>;
}
