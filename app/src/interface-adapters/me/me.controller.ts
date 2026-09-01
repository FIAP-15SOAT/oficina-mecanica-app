import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';
import { ChangeOwnPasswordDto } from '@application/ports/input/me/dto/change-own-password.dto';

export class MeController {
  constructor(private readonly changeOwnPasswordUseCase: ChangeOwnPasswordUseCase) {}

  async changePassword(userId: string, input: ChangeOwnPasswordDto): Promise<void> {
    await this.changeOwnPasswordUseCase.execute(userId, input);
  }
}
