import {
  CreateUserDto,
  CreateUserOutputDto,
} from '@domain/interfaces/use-cases/user/dto/create-user.dto';

export interface ICreateUserUseCase {
  execute(createUserDto: CreateUserDto): Promise<CreateUserOutputDto>;
}
