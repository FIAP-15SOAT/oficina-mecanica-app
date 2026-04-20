import { Module } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { UpdateUserStatusUseCase } from '@application/use-cases/user/update-user-status.use-case';
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
      provide: 'ICreateUserUseCase',
      useFactory: (userRepo: PrismaUserRepository, hashService: BcryptHashService) =>
        new CreateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'IFindUserByIdUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new FindUserByIdUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IFindAllUsersUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new FindAllUsersUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IUpdateUserUseCase',
      useFactory: (userRepo: PrismaUserRepository, hashService: BcryptHashService) =>
        new UpdateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'IUpdateUserStatusUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new UpdateUserStatusUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IDeleteUserUseCase',
      useFactory: (userRepo: PrismaUserRepository) => new DeleteUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
  ],
})
export class UserModule {}
