import { Module } from '@nestjs/common';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  ToggleUserStatusUseCase,
  UpdateUserUseCase,
} from '../../application/use-cases/user';
import { PrismaUserRepository } from '../../infrastructure/repositories';
import { BcryptHashService } from '../../infrastructure/services';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'IHashService',
      useClass: BcryptHashService,
    },
    {
      provide: 'CreateUserUseCase',
      useFactory: (userRepo: PrismaUserRepository, hashService: BcryptHashService) =>
        new CreateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'FindUserByIdUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new FindUserByIdUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'FindAllUsersUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new FindAllUsersUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'UpdateUserUseCase',
      useFactory: (userRepo: PrismaUserRepository, hashService: BcryptHashService) =>
        new UpdateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'ToggleUserStatusUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new ToggleUserStatusUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'DeleteUserUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new DeleteUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
  ],
})
export class UserModule {}
