import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  Prisma,
  ReservationTransferSegmentLeg,
  ReservationTransferSegmentType,
  TransferPointType,
} from '../../generated/prisma/index.js';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { CreateReservationDto } from '../dto/create-reservation.dto.js';
import { ReservationQuoteService } from './reservation-quote.service.js';

const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const QUOTATION_STATUS_CODE = 'QUOTATION';
const INITIAL_TRANSFER_STATUS_ID = 1;
const CANCUN_TIME_ZONE = 'America/Cancun';

@Injectable()
export class ReservationCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationQuoteService: ReservationQuoteService,
  ) {}

  // =========================================================
  // CREATE RESERVATION
  // =========================================================

  async create(dto: CreateReservationDto, userId: number) {
    const quotation = await this.reservationQuoteService.quote(dto);

    const selectedOption = quotation.options.find(
      ({ rateId }) => rateId === dto.rateId,
    );

    if (!selectedOption) {
      throw new BadRequestException(
        'The selected rate is not available for this reservation',
      );
    }

    const [reservationStatus, transferStatus, points] = await Promise.all([
      this.prisma.reservationStatus.findFirst({
        where: {
          code: QUOTATION_STATUS_CODE,
          status: true,
        },
        select: { id: true },
      }),

      this.prisma.transferStatus.findFirst({
        where: {
          id: INITIAL_TRANSFER_STATUS_ID,
          status: true,
        },
        select: { id: true },
      }),

      this.prisma.transferPoint.findMany({
        where: {
          id: {
            in: [dto.originTransferPointId, dto.destinationTransferPointId],
          },
        },
        select: {
          id: true,
          type: true,
        },
      }),
    ]);

    if (!reservationStatus) {
      throw new NotFoundException(
        'Active quotation reservation status not found',
      );
    }

    if (!transferStatus) {
      throw new NotFoundException(
        `Active initial transfer status ${INITIAL_TRANSFER_STATUS_ID} not found`,
      );
    }

    const origin = points.find(({ id }) => id === dto.originTransferPointId);

    const destination = points.find(
      ({ id }) => id === dto.destinationTransferPointId,
    );

    if (!origin || !destination) {
      throw new NotFoundException(
        'Origin or destination transfer point not found',
      );
    }

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );

    const transferGroupUuid = randomUUID();

    const transfers: Prisma.ReservationTransferCreateWithoutReservationInput[] =
      [
        {
          serviceType: {
            connect: { id: dto.serviceTypeId },
          },
          vehicle: {
            connect: { id: selectedOption.vehicle.id },
          },
          rate: {
            connect: { id: dto.rateId },
          },
          originTransferPoint: {
            connect: { id: dto.originTransferPointId },
          },
          destinationTransferPoint: {
            connect: { id: dto.destinationTransferPointId },
          },

          segmentLeg: outboundSegment.leg,
          segmentType: outboundSegment.type,
          transferGroupUuid,

          pickupDate: this.toDatabaseDate(dto.pickupDate),
          pickupTime: this.toDatabaseTime(dto.pickupTime),
          serviceDate: this.toDatabaseDate(dto.serviceDate),
          serviceTime: this.toDatabaseTime(dto.serviceTime),

          passengers: dto.passengers,
          luggage: dto.luggage,
          flightNumber: dto.flightNumber,

          airline: dto.airlineId
            ? { connect: { id: dto.airlineId } }
            : undefined,

          transferStatus: {
            connect: { id: transferStatus.id },
          },
        },
      ];

    // =========================================================
    // RETURN TRANSFER
    // =========================================================

    if (quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE) {
      const returnSegment = this.resolveSegment(
        destination.type,
        origin.type,
        true,
      );

      transfers.push({
        serviceType: {
          connect: { id: dto.serviceTypeId },
        },
        vehicle: {
          connect: { id: selectedOption.vehicle.id },
        },
        rate: {
          connect: { id: dto.rateId },
        },
        originTransferPoint: {
          connect: { id: dto.destinationTransferPointId },
        },
        destinationTransferPoint: {
          connect: { id: dto.originTransferPointId },
        },

        segmentLeg: returnSegment.leg,
        segmentType: returnSegment.type,
        transferGroupUuid,

        pickupDate: this.toDatabaseDate(dto.returnPickupDate!),
        pickupTime: this.toDatabaseTime(dto.returnPickupTime!),
        serviceDate: this.toDatabaseDate(dto.returnServiceDate!),
        serviceTime: this.toDatabaseTime(dto.returnServiceTime!),

        passengers: dto.passengers,
        luggage: dto.luggage,
        flightNumber: dto.returnFlightNumber,

        airline: dto.returnAirlineId
          ? { connect: { id: dto.returnAirlineId } }
          : undefined,

        transferStatus: {
          connect: { id: transferStatus.id },
        },
      });
    }

    // =========================================================
    // SAVE RESERVATION
    // =========================================================

    return this.prisma.reservation.create({
      data: {
        folio: this.generateFolio(),

        currency: {
          connect: { id: dto.currencyId },
        },

        subtotal: selectedOption.price,
        discount: 0,
        total: selectedOption.price,
        paidAmount: 0,
        pendingAmount: selectedOption.price,

        reservationStatus: {
          connect: { id: reservationStatus.id },
        },

        paymentStatus: 'PENDING',
        source: 'ADMIN',

        createdBy: {
          connect: { id: userId },
        },

        reservationCustomer: {
          create: {
            firstName: dto.customer.firstName.trim(),
            lastName: dto.customer.lastName.trim(),
            email: dto.customer.email.trim().toLowerCase(),
            phone: dto.customer.phone?.trim(),

            country: dto.customer.countryId
              ? { connect: { id: dto.customer.countryId } }
              : undefined,
          },
        },

        transfers: {
          create: transfers,
        },
      },

      include: {
        currency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        reservationStatus: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        reservationCustomer: true,

        transfers: {
          include: {
            vehicle: true,
            originTransferPoint: true,
            destinationTransferPoint: true,
            transferStatus: true,
            airline: true,
          },
        },
      },
    });
  }

  // =========================================================
  // RESOLVE TRANSFER SEGMENT
  // =========================================================

  private resolveSegment(
    originType: TransferPointType,
    destinationType: TransferPointType,
    isReturn: boolean,
  ): {
    leg: ReservationTransferSegmentLeg;
    type: ReservationTransferSegmentType;
  } {
    if (
      originType === TransferPointType.AIRPORT &&
      destinationType === TransferPointType.HOTEL
    ) {
      return {
        leg: ReservationTransferSegmentLeg.LLEGADA,
        type: ReservationTransferSegmentType.AH,
      };
    }

    if (
      originType === TransferPointType.HOTEL &&
      destinationType === TransferPointType.AIRPORT
    ) {
      return {
        leg: ReservationTransferSegmentLeg.SALIDA,
        type: ReservationTransferSegmentType.HA,
      };
    }

    if (
      originType === TransferPointType.HOTEL &&
      destinationType === TransferPointType.HOTEL
    ) {
      return {
        leg: isReturn
          ? ReservationTransferSegmentLeg.LLEGADA
          : ReservationTransferSegmentLeg.SALIDA,
        type: ReservationTransferSegmentType.HH,
      };
    }

    throw new BadRequestException(
      'Airport-to-airport transfers are not supported',
    );
  }

  // =========================================================
  // DATABASE DATE UTILITIES
  // =========================================================

  private toDatabaseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private toDatabaseTime(time: string): Date {
    return new Date(`1970-01-01T${time}:00.000Z`);
  }

  // =========================================================
  // GENERATE RESERVATION FOLIO
  // =========================================================

  private generateFolio(): string {
    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: CANCUN_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? '';

    const date = `${getPart('day')}${getPart('month')}${getPart('year')}`;
    const suffix = randomUUID().slice(0, 8).toUpperCase();

    return `GS-${date}-${suffix}`;
  }
}
