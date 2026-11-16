import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TransferPointType } from '../../generated/prisma/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

import type { QuoteReservationTransferDto } from '../dto/quote-reservation-transfer.dto.js';

const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCELLED_STATUS_CODE = 'CANCELLED';

@Injectable()
export class ReservationQuoteService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // QUOTE RESERVATION TRANSFER
  // =========================================================

  async quoteTransfer(reservationId: number, dto: QuoteReservationTransferDto) {
    // =========================================================
    // VALIDATE TRANSFER POINTS
    // =========================================================

    if (dto.originTransferPointId === dto.destinationTransferPointId) {
      throw new BadRequestException(
        'Origin and destination transfer points must be different',
      );
    }

    // =========================================================
    // LOAD RESERVATION, SERVICE TYPE AND TRANSFER POINTS
    // =========================================================

    const [reservation, serviceType, origin, destination] = await Promise.all([
      this.prisma.reservation.findUnique({
        where: { id: reservationId },

        select: {
          id: true,
          folio: true,

          reservationStatus: {
            select: {
              code: true,
            },
          },

          currency: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
        },
      }),

      this.prisma.serviceType.findFirst({
        where: {
          id: dto.serviceTypeId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      }),

      this.prisma.transferPoint.findFirst({
        where: {
          id: dto.originTransferPointId,
          status: true,
          zone: {
            status: true,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          zoneId: true,
        },
      }),

      this.prisma.transferPoint.findFirst({
        where: {
          id: dto.destinationTransferPointId,
          status: true,
          zone: {
            status: true,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          zoneId: true,
        },
      }),
    ]);

    // =========================================================
    // VALIDATE RESERVATION
    // =========================================================

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.reservationStatus.code === CANCELLED_STATUS_CODE) {
      throw new BadRequestException('A cancelled reservation cannot be quoted');
    }

    if (!reservation.currency.status) {
      throw new BadRequestException('Reservation currency is not active');
    }

    // =========================================================
    // VALIDATE SERVICE TYPE
    // =========================================================

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }

    if (
      serviceType.code !== ONE_WAY_SERVICE_CODE &&
      serviceType.code !== ROUND_TRIP_SERVICE_CODE
    ) {
      throw new BadRequestException('Unsupported service type');
    }

    // =========================================================
    // VALIDATE ORIGIN AND DESTINATION
    // =========================================================

    if (!origin) {
      throw new NotFoundException('Active origin transfer point not found');
    }

    if (!destination) {
      throw new NotFoundException(
        'Active destination transfer point not found',
      );
    }

    if (
      origin.type === TransferPointType.AIRPORT &&
      destination.type === TransferPointType.AIRPORT
    ) {
      throw new BadRequestException(
        'Airport-to-airport transfers are not supported',
      );
    }

    // =========================================================
    // FIND AVAILABLE RATES
    // =========================================================

    const rates = await this.prisma.rate.findMany({
      where: {
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,

        currencyId: reservation.currency.id,
        serviceTypeId: serviceType.id,

        status: true,

        vehicle: {
          status: true,

          minPax: {
            lte: dto.passengers,
          },

          maxPax: {
            gte: dto.passengers,
          },
        },
      },

      select: {
        id: true,
        price: true,

        vehicle: {
          select: {
            id: true,
            name: true,
            minPax: true,
            maxPax: true,
            luggageCapacity: true,
            descriptionEs: true,
            descriptionEn: true,
            image: true,
          },
        },
      },

      orderBy: [{ price: 'asc' }, { vehicleId: 'asc' }],
    });

    // =========================================================
    // RESPONSE
    // =========================================================

    return {
      reservation: {
        id: reservation.id,
        folio: reservation.folio,
      },

      currency: {
        id: reservation.currency.id,
        name: reservation.currency.name,
        code: reservation.currency.code,
      },

      serviceType,

      origin: {
        id: origin.id,
        name: origin.name,
      },

      destination: {
        id: destination.id,
        name: destination.name,
      },

      passengers: dto.passengers,

      options: rates.map(({ id, price, vehicle }) => ({
        rateId: id,
        price,
        vehicle,
      })),
    };
  }
}
