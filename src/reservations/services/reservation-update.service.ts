import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  ReservationTransferSegmentLeg,
  ReservationTransferSegmentType,
  TransferPointType,
} from '../../generated/prisma/index.js';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { UpdateReservationDto } from '../dto/update-reservation.dto.js';
import type { UpdateReservationTransferDto } from '../dto/update-reservation-transfer.dto.js';

import { ReservationDetailService } from './reservation-detail.service.js';
import { ReservationQuoteService } from './reservation-quote.service.js';

const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCELLED_STATUS_CODE = 'CANCELLED';
const INITIAL_TRANSFER_STATUS_ID = 1;
const CANCUN_UTC_OFFSET = '-05:00';

@Injectable()
export class ReservationUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationQuoteService: ReservationQuoteService,
    private readonly reservationDetailService: ReservationDetailService,
  ) {}

  // =========================================================
  // UPDATE RESERVATION CUSTOMER
  // =========================================================

  async update(id: number, dto: UpdateReservationDto) {
    const current = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        reservationCustomerId: true,
        reservationStatus: {
          select: { code: true },
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

    if (!current.reservationCustomerId) {
      throw new NotFoundException('Reservation customer not found');
    }

    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException(
        'At least one customer field must be provided',
      );
    }

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const email = dto.email?.trim().toLowerCase();

    if (firstName !== undefined && !firstName) {
      throw new BadRequestException('First name cannot be empty');
    }

    if (lastName !== undefined && !lastName) {
      throw new BadRequestException('Last name cannot be empty');
    }

    if (email !== undefined && !email) {
      throw new BadRequestException('Email cannot be empty');
    }

    if (dto.countryId != null) {
      const country = await this.prisma.country.findFirst({
        where: {
          id: dto.countryId,
          status: true,
        },
        select: { id: true },
      });

      if (!country) {
        throw new NotFoundException('Active country not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id },
        select: {
          reservationCustomerId: true,
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
          'A cancelled reservation cannot be updated',
        );
      }

      if (!reservation.reservationCustomerId) {
        throw new NotFoundException('Reservation customer not found');
      }

      await tx.reservationCustomer.update({
        where: { id: reservation.reservationCustomerId },
        data: {
          firstName,
          lastName,
          email,
          phone:
            dto.phone === undefined ? undefined : dto.phone?.trim() || null,
          countryId: dto.countryId,
        },
      });
    });

    return this.reservationDetailService.findOne(id);
  }

  // =========================================================
  // UPDATE RESERVATION TRANSFER
  // =========================================================

  async updateTransfer(
    reservationId: number,
    transferId: number,
    dto: UpdateReservationTransferDto,
  ) {
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'At least one transfer field must be provided',
      );
    }

    // =========================================================
    // LOAD CURRENT TRANSFER GROUP
    // =========================================================

    const current = await this.prisma.reservationTransfer.findFirst({
      where: {
        id: transferId,
        reservationId,
      },
      select: {
        id: true,
        transferGroupUuid: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Reservation transfer not found');
    }

    const group = await this.prisma.reservationTransfer.findMany({
      where: {
        reservationId,
        transferGroupUuid: current.transferGroupUuid,
      },
      include: {
        serviceType: {
          select: {
            id: true,
            code: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (group.length < 1 || group.length > 2) {
      throw new BadRequestException('Invalid reservation transfer group');
    }

    const outbound = group[0];
    const existingReturn = group[1] ?? null;

    if (
      (outbound.serviceType.code === ROUND_TRIP_SERVICE_CODE &&
        !existingReturn) ||
      (outbound.serviceType.code === ONE_WAY_SERVICE_CODE && existingReturn) ||
      group.some((item) => item.serviceTypeId !== outbound.serviceTypeId)
    ) {
      throw new BadRequestException('Inconsistent reservation transfer group');
    }

    // =========================================================
    // VALIDATE OPERATIONAL STATUS
    // =========================================================

    if (
      group.some((item) => item.transferStatusId !== INITIAL_TRANSFER_STATUS_ID)
    ) {
      throw new BadRequestException(
        'Only transfers in their initial status can be updated',
      );
    }

    // =========================================================
    // MERGE EXISTING DATA WITH REQUEST
    // =========================================================

    const serviceTypeId = dto.serviceTypeId ?? outbound.serviceTypeId;

    const originTransferPointId =
      dto.originTransferPointId ?? outbound.originTransferPointId;

    const destinationTransferPointId =
      dto.destinationTransferPointId ?? outbound.destinationTransferPointId;

    const passengers = dto.passengers ?? outbound.passengers;
    const luggage = dto.luggage ?? outbound.luggage;

    const serviceDate =
      dto.serviceDate ?? this.formatDate(outbound.serviceDate);

    const serviceTime =
      dto.serviceTime ?? this.formatTime(outbound.serviceTime);

    const pickupDate = dto.pickupDate ?? this.formatDate(outbound.pickupDate);

    const pickupTime = dto.pickupTime ?? this.formatTime(outbound.pickupTime);

    const serviceTypeChanged = serviceTypeId !== outbound.serviceTypeId;

    const routeChanged =
      originTransferPointId !== outbound.originTransferPointId ||
      destinationTransferPointId !== outbound.destinationTransferPointId;

    const passengersChanged = passengers !== outbound.passengers;

    const requiresQuotation =
      serviceTypeChanged ||
      routeChanged ||
      passengersChanged ||
      dto.rateId !== undefined;

    // =========================================================
    // VALIDATE SERVICE TYPE
    // =========================================================

    const serviceType = await this.prisma.serviceType.findFirst({
      where: {
        id: serviceTypeId,
        status: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }

    if (
      serviceType.code !== ONE_WAY_SERVICE_CODE &&
      serviceType.code !== ROUND_TRIP_SERVICE_CODE
    ) {
      throw new BadRequestException('Unsupported service type');
    }

    const isRoundTrip = serviceType.code === ROUND_TRIP_SERVICE_CODE;

    // =========================================================
    // VALIDATE QUOTATION
    // =========================================================

    if (requiresQuotation && dto.rateId === undefined) {
      throw new BadRequestException(
        'A new rateId is required when changing the route, passengers or service type',
      );
    }

    if (requiresQuotation) {
      const quotation = await this.reservationQuoteService.quoteTransfer(
        reservationId,
        {
          originTransferPointId,
          destinationTransferPointId,
          serviceTypeId,
          passengers,
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
    }

    // =========================================================
    // RESOLVE RETURN INFORMATION
    // =========================================================

    const returnFields = [
      dto.returnServiceDate,
      dto.returnServiceTime,
      dto.returnPickupDate,
      dto.returnPickupTime,
      dto.returnFlightNumber,
      dto.returnAirlineId,
    ];

    if (!isRoundTrip && returnFields.some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Return information is not allowed for a one-way service',
      );
    }

    const returnServiceDate =
      dto.returnServiceDate ??
      (existingReturn
        ? this.formatDate(existingReturn.serviceDate)
        : undefined);

    const returnServiceTime =
      dto.returnServiceTime ??
      (existingReturn
        ? this.formatTime(existingReturn.serviceTime)
        : undefined);

    const returnPickupDate =
      dto.returnPickupDate ??
      (existingReturn ? this.formatDate(existingReturn.pickupDate) : undefined);

    const returnPickupTime =
      dto.returnPickupTime ??
      (existingReturn ? this.formatTime(existingReturn.pickupTime) : undefined);

    if (
      isRoundTrip &&
      (!returnServiceDate ||
        !returnServiceTime ||
        !returnPickupDate ||
        !returnPickupTime)
    ) {
      throw new BadRequestException(
        'Return service and pickup date/time are required',
      );
    }

    // =========================================================
    // VALIDATE SCHEDULE
    // =========================================================

    const scheduleChanged =
      serviceTypeChanged ||
      dto.serviceDate !== undefined ||
      dto.serviceTime !== undefined ||
      dto.pickupDate !== undefined ||
      dto.pickupTime !== undefined ||
      dto.returnServiceDate !== undefined ||
      dto.returnServiceTime !== undefined ||
      dto.returnPickupDate !== undefined ||
      dto.returnPickupTime !== undefined;

    if (scheduleChanged) {
      this.validateSchedule(
        serviceDate,
        serviceTime,
        pickupDate,
        pickupTime,
        isRoundTrip
          ? {
              serviceDate: returnServiceDate!,
              serviceTime: returnServiceTime!,
              pickupDate: returnPickupDate!,
              pickupTime: returnPickupTime!,
            }
          : null,
      );
    }

    // =========================================================
    // LOAD TRANSFER POINT TYPES
    // =========================================================

    const points = await this.prisma.transferPoint.findMany({
      where: {
        id: {
          in: [originTransferPointId, destinationTransferPointId],
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
    });

    const origin = points.find((item) => item.id === originTransferPointId);

    const destination = points.find(
      (item) => item.id === destinationTransferPointId,
    );

    if (!origin || !destination) {
      throw new NotFoundException(
        'Active origin or destination transfer point not found',
      );
    }

    if (origin.id === destination.id) {
      throw new BadRequestException('Origin and destination must be different');
    }

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );

    const returnSegment = isRoundTrip
      ? this.resolveSegment(destination.type, origin.type, true)
      : null;

    // =========================================================
    // VALIDATE NEW AIRLINES
    // =========================================================

    const airlineIds = [dto.airlineId, dto.returnAirlineId].filter(
      (id): id is number => typeof id === 'number',
    );

    if (airlineIds.length > 0) {
      const airlines = await this.prisma.airline.findMany({
        where: {
          id: { in: airlineIds },
          status: true,
        },
        select: { id: true },
      });

      const validIds = new Set(airlines.map((item) => item.id));

      if (airlineIds.some((id) => !validIds.has(id))) {
        throw new NotFoundException('Active airline not found');
      }
    }

    // =========================================================
    // UPDATE GROUP AND RECALCULATE TOTALS
    // =========================================================

    await this.prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          select: {
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
            'A cancelled reservation cannot be updated',
          );
        }

        // Revalidate that the group has not changed.

        const currentGroup = await tx.reservationTransfer.findMany({
          where: {
            reservationId,
            transferGroupUuid: current.transferGroupUuid,
          },
          select: {
            id: true,
            serviceTypeId: true,
            rateId: true,
            vehicleId: true,
            transferStatusId: true,
          },
          orderBy: { id: 'asc' },
        });

        if (
          currentGroup.length !== group.length ||
          currentGroup.some(
            (item, index) =>
              item.id !== group[index].id ||
              item.serviceTypeId !== group[index].serviceTypeId ||
              item.rateId !== group[index].rateId ||
              item.vehicleId !== group[index].vehicleId ||
              item.transferStatusId !== INITIAL_TRANSFER_STATUS_ID,
          )
        ) {
          throw new BadRequestException(
            'Transfer group has changed. Please reload and try again',
          );
        }

        let rateId = outbound.rateId;
        let vehicleId = outbound.vehicleId;
        let price = outbound.price;

        if (requiresQuotation) {
          const rate = await tx.rate.findFirst({
            where: {
              id: dto.rateId!,
              originZoneId: origin.zoneId,
              destinationZoneId: destination.zoneId,
              currencyId: reservation.currencyId,
              serviceTypeId,
              status: true,
              vehicle: {
                status: true,
                minPax: { lte: passengers },
                maxPax: { gte: passengers },
              },
            },
            select: {
              id: true,
              vehicleId: true,
              price: true,
            },
          });

          if (!rate) {
            throw new BadRequestException(
              'The selected rate is no longer available',
            );
          }

          rateId = rate.id;
          vehicleId = rate.vehicleId;
          price = rate.price;
        }

        // Update outbound transfer.

        await tx.reservationTransfer.update({
          where: { id: outbound.id },
          data: {
            serviceTypeId,
            vehicleId,
            rateId,
            price,

            originTransferPointId,
            destinationTransferPointId,

            segmentLeg: outboundSegment.leg,
            segmentType: outboundSegment.type,

            pickupDate: this.toDatabaseDate(pickupDate),
            pickupTime: this.toDatabaseTime(pickupTime),
            serviceDate: this.toDatabaseDate(serviceDate),
            serviceTime: this.toDatabaseTime(serviceTime),

            passengers,
            luggage,

            flightNumber:
              dto.flightNumber === undefined
                ? undefined
                : dto.flightNumber?.trim() || null,

            airlineId: dto.airlineId,
          },
        });

        // Update, create or remove return transfer.

        if (isRoundTrip && returnSegment) {
          const returnData = {
            serviceTypeId,
            vehicleId,
            rateId,
            price: new Prisma.Decimal(0),

            originTransferPointId: destinationTransferPointId,

            destinationTransferPointId: originTransferPointId,

            segmentLeg: returnSegment.leg,
            segmentType: returnSegment.type,

            pickupDate: this.toDatabaseDate(returnPickupDate!),
            pickupTime: this.toDatabaseTime(returnPickupTime!),
            serviceDate: this.toDatabaseDate(returnServiceDate!),
            serviceTime: this.toDatabaseTime(returnServiceTime!),

            passengers,
            luggage,

            flightNumber:
              dto.returnFlightNumber === undefined
                ? (existingReturn?.flightNumber ?? null)
                : dto.returnFlightNumber?.trim() || null,

            airlineId:
              dto.returnAirlineId === undefined
                ? (existingReturn?.airlineId ?? null)
                : dto.returnAirlineId,
          };

          if (existingReturn) {
            await tx.reservationTransfer.update({
              where: { id: existingReturn.id },
              data: returnData,
            });
          } else {
            await tx.reservationTransfer.create({
              data: {
                ...returnData,
                reservationId,
                transferGroupUuid: current.transferGroupUuid,
                transferStatusId: INITIAL_TRANSFER_STATUS_ID,
              },
            });
          }
        } else if (existingReturn) {
          await tx.reservationTransfer.delete({
            where: { id: existingReturn.id },
          });
        }

        // Recalculate reservation amounts.

        const totals = await tx.reservationTransfer.aggregate({
          where: { reservationId },
          _sum: {
            price: true,
          },
        });

        const subtotal = totals._sum.price ?? new Prisma.Decimal(0);

        const calculatedTotal = subtotal.minus(reservation.discount);

        const total = calculatedTotal.isNegative()
          ? new Prisma.Decimal(0)
          : calculatedTotal;

        const calculatedPending = total.minus(reservation.paidAmount);

        const pendingAmount = calculatedPending.isNegative()
          ? new Prisma.Decimal(0)
          : calculatedPending;

        await tx.reservation.update({
          where: { id: reservationId },
          data: {
            subtotal,
            total,
            pendingAmount,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.reservationDetailService.findOne(reservationId);
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
  // VALIDATE SCHEDULE
  // =========================================================

  private validateSchedule(
    serviceDate: string,
    serviceTime: string,
    pickupDate: string,
    pickupTime: string,
    returnSchedule: {
      serviceDate: string;
      serviceTime: string;
      pickupDate: string;
      pickupTime: string;
    } | null,
  ): void {
    const now = Date.now();

    const serviceAt = this.toCancunTimestamp(serviceDate, serviceTime);

    const pickupAt = this.toCancunTimestamp(pickupDate, pickupTime);

    if (serviceAt < now || pickupAt < now) {
      throw new BadRequestException(
        'Service and pickup date/time cannot be in the past',
      );
    }

    if (!returnSchedule) {
      return;
    }

    const returnServiceAt = this.toCancunTimestamp(
      returnSchedule.serviceDate,
      returnSchedule.serviceTime,
    );

    const returnPickupAt = this.toCancunTimestamp(
      returnSchedule.pickupDate,
      returnSchedule.pickupTime,
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
  // DATE UTILITIES
  // =========================================================

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private formatTime(value: Date): string {
    return value.toISOString().slice(11, 16);
  }

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
