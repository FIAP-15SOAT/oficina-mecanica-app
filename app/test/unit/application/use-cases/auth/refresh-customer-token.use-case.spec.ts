import { UnauthorizedAccessException } from '@application/exceptions/unauthorized-access.exception';
import {
  createMockCustomer,
  createMockCustomerRepository,
} from '../../../../helpers/customer-mock.factory';
import { createMockTokenService } from '../../../../helpers/mock-factories';
import { RefreshCustomerTokenUseCase } from '@application/use-cases/auth/refresh-customer-token.use-case';

const ACCESS_SECRET = 'customer-access-secret';
const REFRESH_SECRET = 'customer-refresh-secret';

describe('RefreshCustomerTokenUseCase', () => {
  let useCase: RefreshCustomerTokenUseCase;
  let customerRepository: ReturnType<typeof createMockCustomerRepository>;
  let tokenService: ReturnType<typeof createMockTokenService>;

  beforeEach(() => {
    customerRepository = createMockCustomerRepository();
    tokenService = createMockTokenService();
    useCase = new RefreshCustomerTokenUseCase(
      customerRepository,
      tokenService,
      ACCESS_SECRET,
      REFRESH_SECRET,
      '15m',
      '7d',
    );
  });

  it('should issue a new token pair for a valid refresh token', async () => {
    const customer = createMockCustomer();
    (tokenService.verifyWithSecret as jest.Mock).mockReturnValue({
      sub: customer.id,
      email: customer.email.value,
      type: 'customer',
    });
    customerRepository.findById.mockResolvedValue(customer);
    (tokenService.signWithSecret as jest.Mock).mockReturnValue('new-signed-token');

    const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

    expect(tokenService.verifyWithSecret).toHaveBeenCalledWith(
      'valid-refresh-token',
      REFRESH_SECRET,
    );
    expect(result.accessToken).toBe('new-signed-token');
    expect(result.refreshToken).toBe('new-signed-token');
  });

  it('should throw UnauthorizedAccessException if the refresh token is invalid', async () => {
    (tokenService.verifyWithSecret as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(useCase.execute({ refreshToken: 'garbage' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });

  it('should throw UnauthorizedAccessException if the customer no longer exists', async () => {
    (tokenService.verifyWithSecret as jest.Mock).mockReturnValue({
      sub: 'deleted-customer-id',
      email: 'x@x.com',
      type: 'customer',
    });
    customerRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ refreshToken: 'valid-but-stale' })).rejects.toThrow(
      UnauthorizedAccessException,
    );
  });
});
