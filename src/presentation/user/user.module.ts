import { Module } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { ToggleUserStatusUseCase } from '@application/use-cases/user/toggle-user-status.use-case';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { PrismaUserRepository } from '@infrastructure/repositories/prisma-user.repository';
import { BcryptHashService } from '@infrastructure/services/bcrypt-hash.service';
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
