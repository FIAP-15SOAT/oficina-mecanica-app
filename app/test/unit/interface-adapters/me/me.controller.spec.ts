import { randomUUID } from 'node:crypto';

import { MeController } from '@interface-adapters/me/me.controller';
import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';

describe('MeController', () => {
  let controller: MeController;
  let changePasswordUseCase: { execute: jest.Mock };

  beforeEach(() => {
    changePasswordUseCase = { execute: jest.fn() };

    controller = new MeController(changePasswordUseCase as unknown as ChangeOwnPasswordUseCase);
  });

  describe('changePassword', () => {
    it('should forward to the use case', async () => {
      const userId = randomUUID();
      const input = { currentPassword: 'old-pass', newPassword: 'new-pass' };

      changePasswordUseCase.execute.mockResolvedValue(undefined);

      await controller.changePassword(userId, input);

      expect(changePasswordUseCase.execute).toHaveBeenCalledWith(userId, input);
    });
  });
});
