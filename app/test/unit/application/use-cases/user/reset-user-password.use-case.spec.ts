import { ResourceNotFoundException } from '@application/exceptions/resource-not-found.exception';
import {
  createMockHashService,
  createMockUser,
  createMockUserRepository,
} from '../../../../helpers/mock-factories';
import { ResetUserPasswordUseCase } from '@application/use-cases/user/reset-user-password.use-case';

describe('ResetUserPasswordUseCase', () => {
  let useCase: ResetUserPasswordUseCase;
  let userRepository: ReturnType<typeof createMockUserRepository>;
  let hashService: ReturnType<typeof createMockHashService>;
  let emailSenderService: { send: jest.Mock };

  beforeEach(() => {
    userRepository = createMockUserRepository();
    hashService = createMockHashService();
    emailSenderService = { send: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResetUserPasswordUseCase(userRepository, hashService, emailSenderService);
  });

  it('should generate a new password, save it, and e-mail it to the user', async () => {
    const user = createMockUser();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockResolvedValue(user);

    await useCase.execute(user.id);

    expect(hashService.hash).toHaveBeenCalledTimes(1);
    const [generatedPassword] = hashService.hash.mock.calls[0];
    expect(userRepository.update).toHaveBeenCalledWith(user);
    expect(emailSenderService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: user.email.value,
        message: expect.objectContaining({ text: expect.stringContaining(generatedPassword) }),
      }),
    );
  });

  it('should throw ResourceNotFoundException if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('inexistente')).rejects.toThrow(ResourceNotFoundException);
    expect(emailSenderService.send).not.toHaveBeenCalled();
  });
});
