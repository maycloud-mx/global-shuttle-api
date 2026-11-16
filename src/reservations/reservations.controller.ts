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
import { ListReservationsDto } from './dto/list-reservations.dto.js';
import { SendQuoteEmailDto } from './dto/send-quote-email.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

import { RESERVATION_PERMISSIONS } from './reservation-permissions.js';

import { ReservationListService } from './services/reservation-list.service.js';
import { ReservationDetailService } from './services/reservation-detail.service.js';
import { ReservationQuoteService } from './services/reservation-quote.service.js';
import { ReservationCreateService } from './services/reservation-create.service.js';
import { ReservationUpdateService } from './services/reservation-update.service.js';
import { ReservationStatusService } from './services/reservation-status.service.js';
import { ReservationEmailService } from './services/reservation-email.service.js';
import { QuoteReservationTransferDto } from './dto/quote-reservation-transfer.dto.js';
import { ReservationTransferCreateService } from './services/reservation-transfer-create.service.js';
import { CreateReservationTransferDto } from './dto/create-reservation-transfer.dto.js';
import { UpdateReservationTransferDto } from './dto/update-reservation-transfer.dto.js';

@Controller('admin/reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(
    private readonly reservationListService: ReservationListService,
    private readonly reservationDetailService: ReservationDetailService,
    private readonly reservationQuoteService: ReservationQuoteService,
    private readonly reservationCreateService: ReservationCreateService,
    private readonly reservationUpdateService: ReservationUpdateService,
    private readonly reservationStatusService: ReservationStatusService,
    private readonly reservationEmailService: ReservationEmailService,
    private readonly reservationTransferCreateService: ReservationTransferCreateService,
  ) {}

  // =========================================================
  // LIST RESERVATIONS
  // =========================================================

  @Get()
  @RequirePermissions(RESERVATION_PERMISSIONS.LIST)
  @ApiMessage('Reservations retrieved successfully')
  findAll(@Query() query: ListReservationsDto) {
    return this.reservationListService.findAll(query);
  }

  // =========================================================
  // QUOTE RESERVATION TRANSFER
  // =========================================================

  @Post(':id/transfers/quote')
  @RequirePermissions(RESERVATION_PERMISSIONS.QUOTE)
  @ApiMessage('Transfer quote retrieved successfully')
  quoteTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QuoteReservationTransferDto,
  ) {
    return this.reservationQuoteService.quoteTransfer(id, dto);
  }
  // =========================================================
  // CREATE RESERVATION
  // =========================================================

  @Post()
  @RequirePermissions(RESERVATION_PERMISSIONS.CREATE)
  @ApiMessage('Reservation created successfully')
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationCreateService.create(dto, user.id);
  }

  // =========================================================
  // GET RESERVATION DETAIL
  // =========================================================

  @Get(':id')
  @RequirePermissions(RESERVATION_PERMISSIONS.VIEW)
  @ApiMessage('Reservation retrieved successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reservationDetailService.findOne(id);
  }

  // =========================================================
  // SEND QUOTE EMAIL
  // =========================================================

  @Post(':id/send-quote-email')
  @RequirePermissions(RESERVATION_PERMISSIONS.SEND_QUOTE_EMAIL)
  @ApiMessage('Reservation quote email sent successfully')
  sendQuoteEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuoteEmailDto,
  ) {
    return this.reservationEmailService.sendQuoteEmail(id, dto);
  }

  // =========================================================
  // CREATE RESERVATION TRANSFER
  // =========================================================

  @Post(':id/transfers')
  @RequirePermissions(RESERVATION_PERMISSIONS.CREATE_TRANSFER)
  @ApiMessage('Reservation transfer created successfully')
  createTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReservationTransferDto,
  ) {
    return this.reservationTransferCreateService.create(id, dto);
  }

  // =========================================================
  // UPDATE RESERVATION CUSTOMER
  // =========================================================

  @Patch(':id')
  @RequirePermissions(RESERVATION_PERMISSIONS.UPDATE)
  @ApiMessage('Reservation customer updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationUpdateService.update(id, dto);
  }

  // =========================================================
  // UPDATE RESERVATION TRANSFER
  // =========================================================

  @Patch(':id/transfers/:transferId')
  @RequirePermissions(RESERVATION_PERMISSIONS.UPDATE)
  @ApiMessage('Reservation transfer updated successfully')
  updateTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Param('transferId', ParseIntPipe) transferId: number,
    @Body() dto: UpdateReservationTransferDto,
  ) {
    return this.reservationUpdateService.updateTransfer(id, transferId, dto);
  }

  // =========================================================
  // CANCEL RESERVATION
  // =========================================================

  @Patch(':id/cancel')
  @RequirePermissions(RESERVATION_PERMISSIONS.CANCEL)
  @ApiMessage('Reservation cancelled successfully')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.reservationStatusService.cancel(id);
  }
}
