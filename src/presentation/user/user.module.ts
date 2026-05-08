import { Module } from '@nestjs/common';
import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { UpdateUserStatusUseCase } from '@application/use-cases/user/update-user-status.use-case';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';
import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@domain/interfaces/services/hash.service.interface';
import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';
import { UserController } from './user.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [UserController],
  providers: [
    {
      provide: 'ICreateUserUseCase',
      useFactory: (userRepo: IUserRepository, hashService: IHashService) =>
        new CreateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'IFindUserByIdUseCase',
      useFactory: (userRepo: IUserRepository) => new FindUserByIdUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IFindAllUsersUseCase',
      useFactory: (userRepo: IUserRepository) => new FindAllUsersUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IUpdateUserUseCase',
      useFactory: (userRepo: IUserRepository, hashService: IHashService) =>
        new UpdateUserUseCase(userRepo, hashService),
      inject: ['IUserRepository', 'IHashService'],
    },
    {
      provide: 'IUpdateUserStatusUseCase',
      useFactory: (userRepo: IUserRepository) => new UpdateUserStatusUseCase(userRepo),
      inject: ['IUserRepository'],
    },
    {
      provide: 'IDeleteUserUseCase',
      useFactory: (userRepo: IUserRepository) => new DeleteUserUseCase(userRepo),
      inject: ['IUserRepository'],
    },
  ],
})
export class UserModule {}
