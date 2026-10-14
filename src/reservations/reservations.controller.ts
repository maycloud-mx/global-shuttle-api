import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationTransfersDto } from './dto/list-reservation-transfers.dto.js';
import { QuoteReservationDto } from './dto/quote-reservation.dto.js';
import { RESERVATION_PERMISSIONS } from './reservation-permissions.js';
import { ReservationsService } from './reservations.service.js';

@Controller('admin/reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('quote')
  @RequirePermissions(RESERVATION_PERMISSIONS.QUOTE)
  @ApiMessage('Reservation quote retrieved successfully')
  quote(@Body() dto: QuoteReservationDto) {
    return this.reservationsService.quote(dto);
  }

  @Post()
  @RequirePermissions(RESERVATION_PERMISSIONS.CREATE)
  @ApiMessage('Reservation created successfully')
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.create(dto, user.id);
  }

  @Get('transfers')
  @RequirePermissions(RESERVATION_PERMISSIONS.LIST)
  @ApiMessage('Reservation transfers retrieved successfully')
  findTransfers(@Query() query: ListReservationTransfersDto) {
    return this.reservationsService.findTransfers(query);
  }
}
