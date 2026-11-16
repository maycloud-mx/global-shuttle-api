import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';

import { ReservationStatusesService } from './reservation-statuses.service.js';

@Controller('admin/reservation-statuses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationStatusesController {
  constructor(
    private readonly reservationStatusesService: ReservationStatusesService,
  ) {}

  // =========================================================
  // GET RESERVATION STATUS OPTIONS
  // =========================================================

  @Get('options')
  @RequirePermissions('reservations:list')
  @ApiMessage('Reservation status options retrieved successfully')
  findOptions() {
    return this.reservationStatusesService.findOptions();
  }
}
