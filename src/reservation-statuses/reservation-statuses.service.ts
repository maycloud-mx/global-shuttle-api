import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { ReservationStatusOptionDto } from './dto/reservation-status-option.dto.js';

@Injectable()
export class ReservationStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // GET ACTIVE RESERVATION STATUS OPTIONS
  // =========================================================

  async findOptions(): Promise<ReservationStatusOptionDto[]> {
    return this.prisma.reservationStatus.findMany({
      where: {
        status: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ id: 'asc' }],
    });
  }
}
