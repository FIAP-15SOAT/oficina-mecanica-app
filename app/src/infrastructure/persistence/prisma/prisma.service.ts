import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { ILogger } from '@application/ports/output/logger.service.interface';
import { TECHNICAL_EVENTS } from '@infrastructure/logging/technical-event.catalog';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger: ILogger;

  constructor(@Inject('ILogger') logger: ILogger) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    super({ adapter });

    this.logger = logger.forContext(PrismaService.name);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.event(TECHNICAL_EVENTS.DATABASE_CONNECTION_FAILED, {}, error);

      throw error;
    }

    this.logger.event(TECHNICAL_EVENTS.DATABASE_CONNECTED, {});
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();

    this.logger.event(TECHNICAL_EVENTS.DATABASE_DISCONNECTED, {});
  }
}
