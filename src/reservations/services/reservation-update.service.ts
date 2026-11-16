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

import type { UpdateReservationDto } from '../dto/update-reservation.dto.js';

import { ReservationDetailService } from './reservation-detail.service.js';
import { ReservationQuoteService } from './reservation-quote.service.js';

const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCELLED_STATUS_CODE = 'CANCELLED';
const INITIAL_TRANSFER_STATUS_ID = 1;

@Injectable()
export class ReservationUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationQuoteService: ReservationQuoteService,
    private readonly reservationDetailService: ReservationDetailService,
  ) {}

  async update(id: number, dto: UpdateReservationDto) {
    // =========================================================
    // GET CURRENT RESERVATION
    // =========================================================

    const current = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        discount: true,
        paidAmount: true,
        reservationCustomerId: true,
        reservationStatus: {
          select: { code: true },
        },
        transfers: {
          select: {
            id: true,
            transferStatusId: true,
            transferGroupUuid: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!current) {
      throw new NotFoundException('Reservation not found');
    }

    if (current.reservationStatus.code === CANCELLED_STATUS_CODE) {
      throw new BadRequestException(
        'A cancelled reservation cannot be updated',
      );
    }

    if (current.transfers.length > 2) {
      throw new BadRequestException(
        'Reservations with more than two transfers cannot be updated using this operation',
      );
    }

    // =========================================================
    // VALIDATE QUOTATION
    // =========================================================

    const quotation = await this.reservationQuoteService.quote(dto);

    const selectedOption = quotation.options.find(
      ({ rateId }) => rateId === dto.rateId,
    );

    if (!selectedOption) {
      throw new BadRequestException(
        'The selected rate is not available for this reservation',
      );
    }

    // =========================================================
    // LOAD TRANSFER POINTS AND INITIAL STATUS
    // =========================================================

    const needsInitialStatus =
      current.transfers.length === 0 ||
      (current.transfers.length < 2 &&
        quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE);

    const [points, initialTransferStatus] = await Promise.all([
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

      needsInitialStatus
        ? this.prisma.transferStatus.findFirst({
            where: {
              id: INITIAL_TRANSFER_STATUS_ID,
              status: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    const origin = points.find(
      ({ id: pointId }) => pointId === dto.originTransferPointId,
    );

    const destination = points.find(
      ({ id: pointId }) => pointId === dto.destinationTransferPointId,
    );

    if (!origin || !destination) {
      throw new NotFoundException(
        'Origin or destination transfer point not found',
      );
    }

    if (needsInitialStatus && !initialTransferStatus) {
      throw new NotFoundException(
        `Active initial transfer status ${INITIAL_TRANSFER_STATUS_ID} not found`,
      );
    }

    // =========================================================
    // CALCULATE TOTALS
    // =========================================================

    const subtotal = selectedOption.price;

    const calculatedTotal = subtotal.minus(current.discount);

    const total = calculatedTotal.isNegative()
      ? new Prisma.Decimal(0)
      : calculatedTotal;

    const calculatedPending = total.minus(current.paidAmount);

    const pendingAmount = calculatedPending.isNegative()
      ? new Prisma.Decimal(0)
      : calculatedPending;

    // =========================================================
    // PREPARE OUTBOUND TRANSFER
    // =========================================================

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );

    const transferGroupUuid =
      current.transfers[0]?.transferGroupUuid ?? randomUUID();

    const outboundData = {
      serviceTypeId: dto.serviceTypeId,
      vehicleId: selectedOption.vehicle.id,
      rateId: dto.rateId,

      originTransferPointId: dto.originTransferPointId,
      destinationTransferPointId: dto.destinationTransferPointId,

      segmentLeg: outboundSegment.leg,
      segmentType: outboundSegment.type,

      pickupDate: this.toDatabaseDate(dto.pickupDate),
      pickupTime: this.toDatabaseTime(dto.pickupTime),
      serviceDate: this.toDatabaseDate(dto.serviceDate),
      serviceTime: this.toDatabaseTime(dto.serviceTime),

      passengers: dto.passengers,
      luggage: dto.luggage,

      flightNumber: dto.flightNumber ?? null,
      airlineId: dto.airlineId ?? null,
    };

    // =========================================================
    // UPDATE RESERVATION AND TRANSFERS
    // =========================================================

    await this.prisma.$transaction(async (tx) => {
      // Update reservation totals

      await tx.reservation.update({
        where: { id },
        data: {
          currencyId: dto.currencyId,
          subtotal,
          total,
          pendingAmount,
        },
      });

      // Update reservation customer

      if (current.reservationCustomerId) {
        await tx.reservationCustomer.update({
          where: {
            id: current.reservationCustomerId,
          },
          data: {
            firstName: dto.customer.firstName.trim(),
            lastName: dto.customer.lastName.trim(),
            email: dto.customer.email.trim().toLowerCase(),
            phone: dto.customer.phone?.trim() ?? null,
            countryId: dto.customer.countryId ?? null,
          },
        });
      } else {
        const customer = await tx.reservationCustomer.create({
          data: {
            firstName: dto.customer.firstName.trim(),
            lastName: dto.customer.lastName.trim(),
            email: dto.customer.email.trim().toLowerCase(),
            phone: dto.customer.phone?.trim(),
            countryId: dto.customer.countryId,
          },
          select: { id: true },
        });

        await tx.reservation.update({
          where: { id },
          data: {
            reservationCustomerId: customer.id,
          },
        });
      }

      // Create or update outbound transfer

      const outboundTransfer = current.transfers[0];

      if (outboundTransfer) {
        await tx.reservationTransfer.update({
          where: { id: outboundTransfer.id },
          data: outboundData,
        });
      } else {
        await tx.reservationTransfer.create({
          data: {
            ...outboundData,
            reservationId: id,
            transferGroupUuid,
            transferStatusId: initialTransferStatus!.id,
          },
        });
      }

      // Create, update or remove return transfer

      const returnTransfer = current.transfers[1];

      if (quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE) {
        const returnSegment = this.resolveSegment(
          destination.type,
          origin.type,
          true,
        );

        const returnData = {
          serviceTypeId: dto.serviceTypeId,
          vehicleId: selectedOption.vehicle.id,
          rateId: dto.rateId,

          originTransferPointId: dto.destinationTransferPointId,

          destinationTransferPointId: dto.originTransferPointId,

          segmentLeg: returnSegment.leg,
          segmentType: returnSegment.type,

          pickupDate: this.toDatabaseDate(dto.returnPickupDate!),
          pickupTime: this.toDatabaseTime(dto.returnPickupTime!),

          serviceDate: this.toDatabaseDate(dto.returnServiceDate!),
          serviceTime: this.toDatabaseTime(dto.returnServiceTime!),

          passengers: dto.passengers,
          luggage: dto.luggage,

          flightNumber: dto.returnFlightNumber ?? null,
          airlineId: dto.returnAirlineId ?? null,
        };

        if (returnTransfer) {
          await tx.reservationTransfer.update({
            where: { id: returnTransfer.id },
            data: returnData,
          });
        } else {
          await tx.reservationTransfer.create({
            data: {
              ...returnData,
              reservationId: id,
              transferGroupUuid,
              transferStatusId: initialTransferStatus!.id,
            },
          });
        }
      } else if (returnTransfer) {
        await tx.reservationTransfer.delete({
          where: { id: returnTransfer.id },
        });
      }
    });

    // =========================================================
    // RETURN UPDATED RESERVATION
    // =========================================================

    return this.reservationDetailService.findOne(id);
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
}
