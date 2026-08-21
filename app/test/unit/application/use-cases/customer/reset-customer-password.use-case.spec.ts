import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { createMockHashService } from '../../../../helpers/mock-factories';
import { ResetCustomerPasswordUseCase } from '@application/use-cases/customer/reset-customer-password.use-case';

describe('ResetCustomerPasswordUseCase', () => {
  let useCase: ResetCustomerPasswordUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResetCustomerPasswordUseCase(customerRepository, hashService, emailSenderService);
  });

  it('should generate a new password, save it, and e-mail it to the customer', async () => {
    const customer = createMockCustomer();
    customerRepository.findById.mockResolvedValue(customer);
    customerRepository.update.mockResolvedValue(customer);

    await useCase.execute(customer.id);

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(customerRepository.update).toHaveBeenCalledWith(customer);
    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: customer.email.value,
        message: expect.objectContaining({ text: expect.stringContaining(generatedPassword) }),
      }),
    );
  });

  it('should throw ResourceNotFoundException if customer does not exist', async () => {
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
    expect(emailSenderService.send).not.toHaveBeenCalled();
  });
});
