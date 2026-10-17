import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { ApiMessage } from '../http/api-message.decorator.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationTransfersDto } from './dto/list-reservation-transfers.dto.js';
import { QuoteReservationDto } from './dto/quote-reservation.dto.js';
import { RequoteReservationDto } from './dto/requote-reservation.dto.js';
import { SendQuoteEmailDto } from './dto/send-quote-email.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';
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

  @Post(':id/requote')
  @RequirePermissions(RESERVATION_PERMISSIONS.REQUOTE)
  @ApiMessage('Reservation requoted successfully')
  requote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequoteReservationDto,
  ) {
    return this.reservationsService.requote(id, dto);
  }

  @Patch(':id')
  @RequirePermissions(RESERVATION_PERMISSIONS.UPDATE)
  @ApiMessage('Reservation updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, dto);
  }

  @Post(':id/send-quote-email')
  @RequirePermissions(RESERVATION_PERMISSIONS.SEND_QUOTE_EMAIL)
  @ApiMessage('Reservation quote email sent successfully')
  sendQuoteEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuoteEmailDto,
  ) {
    return this.reservationsService.sendQuoteEmail(id, dto);
  }

  @Get(':id')
  @RequirePermissions(RESERVATION_PERMISSIONS.VIEW)
  @ApiMessage('Reservation retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.findOne(id);
  }
}
