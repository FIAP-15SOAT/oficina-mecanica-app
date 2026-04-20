import {
  UpdateUserDto,
  UpdateUserOutputDto,
} from '@domain/interfaces/use-cases/user/dto/update-user.dto';

export interface IUpdateUserUseCase {
  execute(id: string, updateUserDto: UpdateUserDto): Promise<UpdateUserOutputDto>;
}
