import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';

import { DashboardFiltersDto } from './dto/dashboard-filters.dto.js';
import { DashboardOverviewService } from './services/dashboard-overview.service.js';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardOverviewService: DashboardOverviewService,
  ) {}

  // =========================================================
  // OVERVIEW
  // =========================================================

  @Get('overview')
  @ApiMessage('Dashboard overview retrieved successfully')
  getOverview(@Query() query: DashboardFiltersDto) {
    return this.dashboardOverviewService.getOverview(query);
  }
}
