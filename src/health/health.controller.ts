import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('database')
  async database() {
    try {
      await this.prisma.checkConnection();
      return { database: 'up' };
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : 'Unknown database error',
      );
      throw new ServiceUnavailableException({ database: 'down' });
    }
  }
}
