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

import type { CreateReservationTransferDto } from '../dto/create-reservation-transfer.dto.js';

import { ReservationQuoteService } from './reservation-quote.service.js';

const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const CANCELLED_STATUS_CODE = 'CANCELLED';
const INITIAL_TRANSFER_STATUS_ID = 1;
const CANCUN_UTC_OFFSET = '-05:00';

@Injectable()
export class ReservationTransferCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationQuoteService: ReservationQuoteService,
  ) {}

  // =========================================================
  // CREATE RESERVATION TRANSFER
  // =========================================================

  async create(reservationId: number, dto: CreateReservationTransferDto) {
    // =========================================================
    // VALIDATE QUOTATION
    // =========================================================

    const quotation = await this.reservationQuoteService.quoteTransfer(
      reservationId,
      {
        serviceTypeId: dto.serviceTypeId,
        originTransferPointId: dto.originTransferPointId,
        destinationTransferPointId: dto.destinationTransferPointId,
        passengers: dto.passengers,
      },
    );

    const selectedOption = quotation.options.find(
      ({ rateId }) => rateId === dto.rateId,
    );

    if (!selectedOption) {
      throw new BadRequestException(
        'The selected rate is not available for this transfer',
      );
    }

    // =========================================================
    // VALIDATE SCHEDULE
    // =========================================================

    this.validateSchedule(dto, quotation.serviceType.code);

    // =========================================================
    // LOAD TRANSFER POINTS AND AIRLINES
    // =========================================================

    const [points, airline, returnAirline] = await Promise.all([
      this.prisma.transferPoint.findMany({
        where: {
          id: {
            in: [dto.originTransferPointId, dto.destinationTransferPointId],
          },
          status: true,
          zone: {
            status: true,
          },
        },
        select: {
          id: true,
          type: true,
          zoneId: true,
        },
      }),

      dto.airlineId
        ? this.prisma.airline.findFirst({
            where: {
              id: dto.airlineId,
              status: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),

      dto.returnAirlineId
        ? this.prisma.airline.findFirst({
            where: {
              id: dto.returnAirlineId,
              status: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const origin = points.find(({ id }) => id === dto.originTransferPointId);

    const destination = points.find(
      ({ id }) => id === dto.destinationTransferPointId,
    );

    if (!origin || !destination) {
      throw new NotFoundException(
        'Active origin or destination transfer point not found',
      );
    }

    if (dto.airlineId && !airline) {
      throw new NotFoundException('Active airline not found');
    }

    if (dto.returnAirlineId && !returnAirline) {
      throw new NotFoundException('Active return airline not found');
    }

    // =========================================================
    // RESOLVE TRANSFER SEGMENTS
    // =========================================================

    const isRoundTrip = quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE;

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );

    const returnSegment = isRoundTrip
      ? this.resolveSegment(destination.type, origin.type, true)
      : null;

    const transferGroupUuid = randomUUID();

    // =========================================================
    // CREATE TRANSFERS AND UPDATE RESERVATION TOTALS
    // =========================================================

    return this.prisma.$transaction(async (tx) => {
      // Validate current reservation state

      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          currencyId: true,
          discount: true,
          paidAmount: true,
          reservationStatus: {
            select: { code: true },
          },
        },
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      if (reservation.reservationStatus.code === CANCELLED_STATUS_CODE) {
        throw new BadRequestException(
          'A cancelled reservation cannot receive transfers',
        );
      }

      if (reservation.currencyId !== quotation.currency.id) {
        throw new BadRequestException(
          'Reservation currency has changed. Please quote again',
        );
      }

      // Validate selected rate again before saving

      const rate = await tx.rate.findFirst({
        where: {
          id: dto.rateId,
          originZoneId: origin.zoneId,
          destinationZoneId: destination.zoneId,
          currencyId: reservation.currencyId,
          serviceTypeId: dto.serviceTypeId,
          status: true,
          vehicle: {
            status: true,
            minPax: { lte: dto.passengers },
            maxPax: { gte: dto.passengers },
          },
        },
        select: {
          id: true,
          price: true,
          vehicleId: true,
        },
      });

      if (!rate) {
        throw new BadRequestException(
          'The selected rate is no longer available',
        );
      }

      const initialTransferStatus = await tx.transferStatus.findFirst({
        where: {
          id: INITIAL_TRANSFER_STATUS_ID,
          status: true,
        },
        select: {
          id: true,
        },
      });

      if (!initialTransferStatus) {
        throw new NotFoundException('Active initial transfer status not found');
      }

      // Create outbound transfer

      const outboundTransfer = await tx.reservationTransfer.create({
        data: {
          reservationId,
          serviceTypeId: dto.serviceTypeId,
          vehicleId: rate.vehicleId,
          rateId: rate.id,

          price: rate.price,

          originTransferPointId: dto.originTransferPointId,
          destinationTransferPointId: dto.destinationTransferPointId,

          segmentLeg: outboundSegment.leg,
          segmentType: outboundSegment.type,

          transferGroupUuid,

          pickupDate: this.toDatabaseDate(dto.pickupDate),
          pickupTime: this.toDatabaseTime(dto.pickupTime),
          serviceDate: this.toDatabaseDate(dto.serviceDate),
          serviceTime: this.toDatabaseTime(dto.serviceTime),

          passengers: dto.passengers,
          luggage: dto.luggage,

          flightNumber: dto.flightNumber?.trim() || null,
          airlineId: dto.airlineId ?? null,

          transferStatusId: initialTransferStatus.id,
        },
      });

      const transfers = [outboundTransfer];

      // =========================================================
      // CREATE RETURN TRANSFER
      // =========================================================

      if (isRoundTrip && returnSegment) {
        const returnTransfer = await tx.reservationTransfer.create({
          data: {
            reservationId,
            serviceTypeId: dto.serviceTypeId,
            vehicleId: rate.vehicleId,
            rateId: rate.id,

            // The round-trip price is stored on outbound.
            // Avoid charging the same rate twice.
            price: new Prisma.Decimal(0),

            originTransferPointId: dto.destinationTransferPointId,
            destinationTransferPointId: dto.originTransferPointId,

            segmentLeg: returnSegment.leg,
            segmentType: returnSegment.type,

            transferGroupUuid,

            pickupDate: this.toDatabaseDate(dto.returnPickupDate!),
            pickupTime: this.toDatabaseTime(dto.returnPickupTime!),
            serviceDate: this.toDatabaseDate(dto.returnServiceDate!),
            serviceTime: this.toDatabaseTime(dto.returnServiceTime!),

            passengers: dto.passengers,
            luggage: dto.luggage,

            flightNumber: dto.returnFlightNumber?.trim() || null,
            airlineId: dto.returnAirlineId ?? null,

            transferStatusId: initialTransferStatus.id,
          },
        });

        transfers.push(returnTransfer);
      }

      // =========================================================
      // RECALCULATE RESERVATION TOTALS
      // =========================================================

      const aggregate = await tx.reservationTransfer.aggregate({
        where: {
          reservationId,
        },
        _sum: {
          price: true,
        },
      });

      const subtotal = aggregate._sum.price ?? new Prisma.Decimal(0);

      const calculatedTotal = subtotal.minus(reservation.discount);

      const total = calculatedTotal.isNegative()
        ? new Prisma.Decimal(0)
        : calculatedTotal;

      const calculatedPending = total.minus(reservation.paidAmount);

      const pendingAmount = calculatedPending.isNegative()
        ? new Prisma.Decimal(0)
        : calculatedPending;

      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          subtotal,
          total,
          pendingAmount,
        },
        select: {
          id: true,
          folio: true,
          subtotal: true,
          discount: true,
          total: true,
          paidAmount: true,
          pendingAmount: true,
          paymentStatus: true,
        },
      });

      // =========================================================
      // RESPONSE
      // =========================================================

      return {
        reservation: updatedReservation,
        transferGroupUuid,
        serviceType: quotation.serviceType,
        currency: quotation.currency,
        transfers,
      };
    });
  }

  // =========================================================
  // VALIDATE SCHEDULE
  // =========================================================

  private validateSchedule(
    dto: CreateReservationTransferDto,
    serviceTypeCode: string,
  ): void {
    const now = Date.now();

    const serviceAt = this.toCancunTimestamp(dto.serviceDate, dto.serviceTime);

    const pickupAt = this.toCancunTimestamp(dto.pickupDate, dto.pickupTime);

    if (serviceAt < now || pickupAt < now) {
      throw new BadRequestException(
        'Service and pickup date/time cannot be in the past',
      );
    }

    const returnFields = [
      dto.returnServiceDate,
      dto.returnServiceTime,
      dto.returnPickupDate,
      dto.returnPickupTime,
    ];

    if (serviceTypeCode === ONE_WAY_SERVICE_CODE) {
      if (
        returnFields.some((value) => value !== undefined) ||
        dto.returnFlightNumber !== undefined ||
        dto.returnAirlineId !== undefined
      ) {
        throw new BadRequestException(
          'Return information is not allowed for a one-way service',
        );
      }

      return;
    }

    if (serviceTypeCode !== ROUND_TRIP_SERVICE_CODE) {
      throw new BadRequestException('Unsupported service type');
    }

    if (returnFields.some((value) => value == null)) {
      throw new BadRequestException(
        'Return service and pickup date/time are required',
      );
    }

    const returnServiceAt = this.toCancunTimestamp(
      dto.returnServiceDate!,
      dto.returnServiceTime!,
    );

    const returnPickupAt = this.toCancunTimestamp(
      dto.returnPickupDate!,
      dto.returnPickupTime!,
    );

    if (returnServiceAt < now || returnPickupAt < now) {
      throw new BadRequestException(
        'Return service and pickup date/time cannot be in the past',
      );
    }

    if (returnServiceAt <= serviceAt || returnPickupAt <= pickupAt) {
      throw new BadRequestException(
        'Return date/time must be later than outbound date/time',
      );
    }
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

  private toDatabaseDate(value: string): Date {
    this.validateCalendarDate(value);
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDatabaseTime(value: string): Date {
    return new Date(`1970-01-01T${value}:00.000Z`);
  }

  private toCancunTimestamp(date: string, time: string): number {
    this.validateCalendarDate(date);

    const timestamp = Date.parse(`${date}T${time}:00${CANCUN_UTC_OFFSET}`);

    if (Number.isNaN(timestamp)) {
      throw new BadRequestException('Invalid service or pickup date/time');
    }

    return timestamp;
  }

  private validateCalendarDate(value: string): void {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid calendar date');
    }
  }
}
