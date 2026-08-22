import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { createMockHashService, createMockTokenService } from '../../../../helpers/mock-factories';
import { AuthenticateCustomerUseCase } from '@application/use-cases/auth/authenticate-customer.use-case';

const ACCESS_SECRET = 'customer-access-secret';
const REFRESH_SECRET = 'customer-refresh-secret';

describe('AuthenticateCustomerUseCase', () => {
  let useCase: AuthenticateCustomerUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    hashService = createMockHashService();
    tokenService = createMockTokenService();
    useCase = new AuthenticateCustomerUseCase(
      customerRepository,
      hashService,
      tokenService,
      ACCESS_SECRET,
      REFRESH_SECRET,
      '15m',
      '7d',
    );
  });

  it('should authenticate by e-mail and return tokens', async () => {
    const customer = createMockCustomer();
    customerRepository.findByEmail.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);
    (tokenService.signWithSecret as jest.Mock).mockReturnValue('signed-token');

    const result = await useCase.execute({
      identifier: customer.email.value,
      password: 'Senha@123',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');
    expect(result.customer.id).toBe(customer.id);
    expect(result.customer.document).toBe(customer.document.value);
    expect(tokenService.signWithSecret).toHaveBeenCalledWith(
      { sub: customer.id, email: customer.email.value, type: 'customer' },
      ACCESS_SECRET,
      '15m',
    );
    expect(tokenService.signWithSecret).toHaveBeenCalledWith(
      { sub: customer.id, email: customer.email.value, type: 'customer' },
      REFRESH_SECRET,
      '7d',
    );
  });

  it('should authenticate by document when identifier has no @', async () => {
    const customer = createMockCustomer();
    customerRepository.findByDocument.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(true);

    await useCase.execute({ identifier: customer.document.value, password: 'Senha@123' });

    expect(customerRepository.findByDocument).toHaveBeenCalledWith(customer.document.value);
    expect(customerRepository.findByEmail).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessException if customer does not exist', async () => {
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'naoexiste@email.com', password: 'Senha@123' }),
    ).rejects.toThrow(UnauthorizedAccessException);
  });

  it('should throw UnauthorizedAccessException if password is incorrect', async () => {
    const customer = createMockCustomer();
    customerRepository.findByEmail.mockResolvedValue(customer);
    hashService.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ identifier: customer.email.value, password: 'errada' }),
    ).rejects.toThrow('Credenciais inválidas');
  });

  it('should still perform a password comparison even when the identifier is not found (timing-safety)', async () => {
    customerRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ identifier: 'naoexiste@email.com', password: 'x' }),
    ).rejects.toThrow();

    expect(hashService.compare).toHaveBeenCalled();
  });
});
