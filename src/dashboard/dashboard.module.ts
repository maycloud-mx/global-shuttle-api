import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { DashboardController } from './dashboard.controller.js';
import { DashboardOverviewService } from './services/dashboard-overview.service.js';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardOverviewService],
})
export class DashboardModule {}
