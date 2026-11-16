import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';

import { ReservationsController } from './reservations.controller.js';

import { ReservationListService } from './services/reservation-list.service.js';
import { ReservationDetailService } from './services/reservation-detail.service.js';
import { ReservationQuoteService } from './services/reservation-quote.service.js';
import { ReservationCreateService } from './services/reservation-create.service.js';
import { ReservationUpdateService } from './services/reservation-update.service.js';
import { ReservationStatusService } from './services/reservation-status.service.js';
import { ReservationEmailService } from './services/reservation-email.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
  providers: [
    ReservationListService,
    ReservationDetailService,
    ReservationQuoteService,
    ReservationCreateService,
    ReservationUpdateService,
    ReservationStatusService,
    ReservationEmailService,
  ],
})
export class ReservationsModule {}
