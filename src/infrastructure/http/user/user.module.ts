import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { CreateUserUseCase } from '@application/use-cases/user/create-user.use-case';
import { DeleteUserUseCase } from '@application/use-cases/user/delete-user.use-case';
import { FindAllUsersUseCase } from '@application/use-cases/user/find-all-users.use-case';
import { FindUserByIdUseCase } from '@application/use-cases/user/find-user-by-id.use-case';
import { UpdateUserStatusUseCase } from '@application/use-cases/user/update-user-status.use-case';
import { UpdateUserUseCase } from '@application/use-cases/user/update-user.use-case';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';

import { UserController as UserCleanController } from '@interface-adapters/user/user.controller';
import { UserController } from './user.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [UserController],
  providers: [
    {
      provide: UserCleanController,
      useFactory: (userRepository: IUserRepository, hashService: IHashService) =>
        new UserCleanController(
          new CreateUserUseCase(userRepository, hashService),
          new FindUserByIdUseCase(userRepository),
          new FindAllUsersUseCase(userRepository),
          new UpdateUserUseCase(userRepository, hashService),
          new UpdateUserStatusUseCase(userRepository),
          new DeleteUserUseCase(userRepository),
        ),
      inject: ['IUserRepository', 'IHashService'],
    },
  ],
})
export class UserModule {}
