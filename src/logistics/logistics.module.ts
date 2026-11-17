import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { LogisticsController } from './logistics.controller.js';

import { LogisticsListService } from './services/logistics-list.service.js';
import { LogisticsAssignmentService } from './services/logistics-assignment.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LogisticsController],
  providers: [LogisticsListService, LogisticsAssignmentService],
})
export class LogisticsModule {}
