import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ReservationDetailService } from './reservation-detail.service.js';

const CANCELLED_STATUS_CODE = 'CANCELLED';

@Injectable()
export class ReservationStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationDetailService: ReservationDetailService,
  ) {}

  // =========================================================
  // CANCEL RESERVATION
  // =========================================================

  async cancel(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        reservationStatus: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    // Return the existing reservation if already cancelled.
    if (reservation.reservationStatus.code === CANCELLED_STATUS_CODE) {
      return this.reservationDetailService.findOne(id);
    }

    const cancelledStatus = await this.prisma.reservationStatus.findFirst({
      where: {
        code: CANCELLED_STATUS_CODE,
        status: true,
      },
      select: {
        id: true,
      },
    });

    if (!cancelledStatus) {
      throw new NotFoundException(
        'Active cancelled reservation status not found',
      );
    }

    await this.prisma.reservation.update({
      where: { id },
      data: {
        reservationStatusId: cancelledStatus.id,
      },
    });

    return this.reservationDetailService.findOne(id);
  }
}
