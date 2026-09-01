import { Module } from '@nestjs/common';

import { InfrastructureServicesModule } from '@infrastructure/services/infrastructure-services.module';

import { ChangeOwnPasswordUseCase } from '@application/use-cases/me/change-own-password.use-case';

import { IUserRepository } from '@domain/interfaces/repositories/user.repository.interface';
import { IHashService } from '@application/ports/output/hash.service.interface';

import { MeController as MeCleanController } from '@interface-adapters/me/me.controller';
import { MeController } from './me.controller';

@Module({
  imports: [InfrastructureServicesModule],
  controllers: [MeController],
  providers: [
    {
      provide: MeCleanController,
      useFactory: (userRepository: IUserRepository, hashService: IHashService) =>
        new MeCleanController(new ChangeOwnPasswordUseCase(userRepository, hashService)),
      inject: ['IUserRepository', 'IHashService'],
    },
  ],
})
export class MeModule {}
