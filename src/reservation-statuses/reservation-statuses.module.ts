import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { ReservationStatusesController } from './reservation-statuses.controller.js';
import { ReservationStatusesService } from './reservation-statuses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReservationStatusesController],
  providers: [ReservationStatusesService],
})
export class ReservationStatusesModule {}
