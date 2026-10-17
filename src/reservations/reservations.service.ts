import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import {
  renderReservationQuoteEmail,
  renderReservationQuoteText,
} from '../email/templates/reservation-quote.template.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ListReservationTransfersDto } from './dto/list-reservation-transfers.dto.js';
import type { QuoteReservationDto } from './dto/quote-reservation.dto.js';
import type { RequoteReservationDto } from './dto/requote-reservation.dto.js';
import type { UpdateReservationDto } from './dto/update-reservation.dto.js';
import type { SendQuoteEmailDto } from './dto/send-quote-email.dto.js';

const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCUN_UTC_OFFSET = '-05:00';
const CANCUN_TIME_ZONE = 'America/Cancun';
const QUOTATION_STATUS_CODE = 'QUOTATION';
const INITIAL_TRANSFER_STATUS_ID = 1;

const transferListSelect = {
  id: true,
  segmentLeg: true,
  segmentType: true,
  pickupDate: true,
  pickupTime: true,
  serviceDate: true,
  serviceTime: true,
  passengers: true,
  flightNumber: true,
  airline: { select: { id: true, name: true } },
  operatorName: true,
  unitName: true,
  originTransferPoint: { select: { id: true, name: true } },
  destinationTransferPoint: { select: { id: true, name: true } },
  transferStatus: { select: { id: true, name: true } },
  reservation: {
    select: {
      id: true,
      folio: true,
      businessPartnerCode: true,
      paymentStatus: true,
      paidAmount: true,
      discount: true,
      total: true,
      reservationStatus: { select: { id: true, name: true, code: true } },
      reservationCustomer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          country: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.ReservationTransferSelect;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async quote(dto: QuoteReservationDto) {
    if (dto.originTransferPointId === dto.destinationTransferPointId) {
      throw new BadRequestException(
        'Origin and destination transfer points must be different',
      );
    }

    const [
      currency,
      serviceType,
      origin,
      destination,
      airline,
      returnAirline,
      country,
    ] = await Promise.all([
        this.prisma.currency.findFirst({
          where: { id: dto.currencyId, status: true },
          select: { id: true, name: true, code: true },
        }),
        this.prisma.serviceType.findFirst({
          where: { id: dto.serviceTypeId, status: true },
          select: { id: true, name: true, code: true },
        }),
        this.prisma.transferPoint.findFirst({
          where: { id: dto.originTransferPointId, status: true },
          select: { id: true, name: true, code: true, zoneId: true },
        }),
        this.prisma.transferPoint.findFirst({
          where: { id: dto.destinationTransferPointId, status: true },
          select: { id: true, name: true, code: true, zoneId: true },
        }),
        dto.airlineId
          ? this.prisma.airline.findFirst({
              where: { id: dto.airlineId, status: true },
              select: { id: true, name: true, iataCode: true, icaoCode: true },
            })
          : Promise.resolve(null),
        dto.returnAirlineId
          ? this.prisma.airline.findFirst({
              where: { id: dto.returnAirlineId, status: true },
              select: { id: true, name: true, iataCode: true, icaoCode: true },
            })
          : Promise.resolve(null),
        dto.customer.countryId
          ? this.prisma.country.findFirst({
              where: { id: dto.customer.countryId, status: true },
              select: { id: true, name: true, iso2: true, phoneCode: true },
            })
          : Promise.resolve(null),
      ]);

    if (!currency) throw new NotFoundException('Active currency not found');
    if (!serviceType)
      throw new NotFoundException('Active service type not found');
    if (!origin)
      throw new NotFoundException('Active origin transfer point not found');
    if (!destination)
      throw new NotFoundException('Active destination transfer point not found');
    if (dto.airlineId && !airline)
      throw new NotFoundException('Active airline not found');
    if (dto.returnAirlineId && !returnAirline)
      throw new NotFoundException('Active return airline not found');
    if (dto.customer.countryId && !country)
      throw new NotFoundException('Active country not found');

    this.validateSchedule(dto, serviceType.code);

    const rates = await this.prisma.rate.findMany({
      where: {
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,
        currencyId: dto.currencyId,
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
        vehicle: {
          select: {
            id: true,
            name: true,
            code: true,
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

    return {
      customer: {
        firstName: dto.customer.firstName,
        lastName: dto.customer.lastName,
        email: dto.customer.email,
        phone: dto.customer.phone ?? null,
        country,
      },
      currency,
      serviceType,
      origin: {
        id: origin.id,
        name: origin.name,
        code: origin.code,
      },
      destination: {
        id: destination.id,
        name: destination.name,
        code: destination.code,
      },
      passengers: dto.passengers,
      luggage: dto.luggage,
      serviceDate: dto.serviceDate,
      serviceTime: dto.serviceTime,
      pickupDate: dto.pickupDate,
      pickupTime: dto.pickupTime,
      flightNumber: dto.flightNumber ?? null,
      airline: airline ?? null,
      return:
        serviceType.code === ROUND_TRIP_SERVICE_CODE
          ? {
              origin: {
                id: destination.id,
                name: destination.name,
                code: destination.code,
              },
              destination: {
                id: origin.id,
                name: origin.name,
                code: origin.code,
              },
              serviceDate: dto.returnServiceDate,
              serviceTime: dto.returnServiceTime,
              pickupDate: dto.returnPickupDate,
              pickupTime: dto.returnPickupTime,
              flightNumber: dto.returnFlightNumber ?? null,
              airline: returnAirline ?? null,
            }
          : null,
      options: rates.map(({ id, price, vehicle }) => ({
        rateId: id,
        price,
        vehicle,
      })),
    };
  }

  async create(dto: CreateReservationDto, userId: number) {
    const quotation = await this.quote(dto);
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
        where: { code: QUOTATION_STATUS_CODE, status: true },
        select: { id: true },
      }),
      this.prisma.transferStatus.findFirst({
        where: { id: INITIAL_TRANSFER_STATUS_ID, status: true },
        select: { id: true },
      }),
      this.prisma.transferPoint.findMany({
        where: {
          id: {
            in: [dto.originTransferPointId, dto.destinationTransferPointId],
          },
        },
        select: { id: true, type: true },
      }),
    ]);
    if (!reservationStatus) {
      throw new NotFoundException('Active quotation reservation status not found');
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
      throw new NotFoundException('Origin or destination transfer point not found');
    }

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );
    const transferGroupUuid = randomUUID();
    const transfers: Prisma.ReservationTransferCreateWithoutReservationInput[] = [
      {
        serviceType: { connect: { id: dto.serviceTypeId } },
        vehicle: { connect: { id: selectedOption.vehicle.id } },
        rate: { connect: { id: dto.rateId } },
        originTransferPoint: { connect: { id: dto.originTransferPointId } },
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
        transferStatus: { connect: { id: transferStatus.id } },
      },
    ];

    if (quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE) {
      const returnSegment = this.resolveSegment(
        destination.type,
        origin.type,
        true,
      );
      transfers.push({
        serviceType: { connect: { id: dto.serviceTypeId } },
        vehicle: { connect: { id: selectedOption.vehicle.id } },
        rate: { connect: { id: dto.rateId } },
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
        transferStatus: { connect: { id: transferStatus.id } },
      });
    }

    return this.prisma.reservation.create({
      data: {
        folio: this.generateFolio(),
        currency: { connect: { id: dto.currencyId } },
        subtotal: selectedOption.price,
        discount: 0,
        total: selectedOption.price,
        paidAmount: 0,
        pendingAmount: selectedOption.price,
        reservationStatus: { connect: { id: reservationStatus.id } },
        paymentStatus: 'PENDING',
        source: 'ADMIN',
        createdBy: { connect: { id: userId } },
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
        transfers: { create: transfers },
      },
      include: {
        currency: { select: { id: true, name: true, code: true } },
        reservationStatus: { select: { id: true, name: true, code: true } },
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

  private resolveSegment(
    originType: 'HOTEL' | 'AIRPORT',
    destinationType: 'HOTEL' | 'AIRPORT',
    isReturn: boolean,
  ): {
    leg: 'SALIDA' | 'LLEGADA';
    type: 'AH' | 'HA' | 'HH';
  } {
    if (originType === 'AIRPORT' && destinationType === 'HOTEL') {
      return { leg: 'LLEGADA', type: 'AH' };
    }
    if (originType === 'HOTEL' && destinationType === 'AIRPORT') {
      return { leg: 'SALIDA', type: 'HA' };
    }
    if (originType === 'HOTEL' && destinationType === 'HOTEL') {
      return { leg: isReturn ? 'LLEGADA' : 'SALIDA', type: 'HH' };
    }
    throw new BadRequestException('Airport-to-airport transfers are not supported');
  }

  private toDatabaseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }

  private toDatabaseTime(time: string): Date {
    return new Date(`1970-01-01T${time}:00.000Z`);
  }

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

  private validateSchedule(dto: QuoteReservationDto, serviceTypeCode: string) {
    if (
      serviceTypeCode !== ONE_WAY_SERVICE_CODE &&
      serviceTypeCode !== ROUND_TRIP_SERVICE_CODE
    ) {
      throw new BadRequestException('Unsupported service type');
    }

    const now = Date.now();
    const serviceAt = this.toCancunTimestamp(dto.serviceDate, dto.serviceTime);
    const pickupAt = this.toCancunTimestamp(dto.pickupDate, dto.pickupTime);
    if (serviceAt < now || pickupAt < now) {
      throw new BadRequestException(
        'Service and pickup date/time cannot be earlier than the current date/time',
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

    if (returnFields.some((value) => value === undefined)) {
      throw new BadRequestException(
        'Return service and pickup date/time are required for a round trip',
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
        'Return service and pickup date/time cannot be earlier than the current date/time',
      );
    }
    if (returnServiceAt <= serviceAt || returnPickupAt <= pickupAt) {
      throw new BadRequestException(
        'Return date/time must be later than the outbound date/time',
      );
    }
  }

  private toCancunTimestamp(date: string, time: string): number {
    const timestamp = Date.parse(`${date}T${time}:00${CANCUN_UTC_OFFSET}`);
    if (Number.isNaN(timestamp)) {
      throw new BadRequestException('Invalid service or pickup date/time');
    }
    return timestamp;
  }

  async findOne(id: number) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        currency: { select: { id: true, name: true, code: true } },
        reservationStatus: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        businessPartner: {
          select: {
            id: true,
            name: true,
            companyName: true,
            code: true,
            discountPercentage: true,
          },
        },
        reservationCustomer: {
          include: {
            country: {
              select: { id: true, name: true, iso2: true, phoneCode: true },
            },
          },
        },
        transfers: {
          include: {
            serviceType: {
              select: { id: true, name: true, code: true },
            },
            vehicle: true,
            rate: { select: { id: true, price: true } },
            originTransferPoint: true,
            destinationTransferPoint: true,
            transferStatus: { select: { id: true, name: true } },
            airline: true,
          },
          orderBy: [{ serviceDate: 'asc' }, { serviceTime: 'asc' }],
        },
        payments: {
          select: {
            id: true,
            paymentMethod: true,
            provider: true,
            providerStatus: true,
            paymentStatus: true,
            amount: true,
            paymentDate: true,
            expiresAt: true,
            approvedAt: true,
            capturedAt: true,
            cancelledAt: true,
            failedAt: true,
            reference: true,
            receiptFile: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            currency: { select: { id: true, name: true, code: true } },
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  async requote(id: number, dto: RequoteReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        folio: true,
        total: true,
        currency: { select: { id: true, name: true, code: true } },
        reservationStatus: {
          select: { id: true, name: true, code: true },
        },
        transfers: {
          select: {
            rateId: true,
            vehicle: { select: { id: true, name: true, code: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.reservationStatus.code === 'CANCELLED') {
      throw new BadRequestException('A cancelled reservation cannot be requoted');
    }
    if (dto.originTransferPointId === dto.destinationTransferPointId) {
      throw new BadRequestException(
        'Origin and destination transfer points must be different',
      );
    }

    const [currency, serviceType, origin, destination] = await Promise.all([
      this.prisma.currency.findFirst({
        where: { id: dto.currencyId, status: true },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.serviceType.findFirst({
        where: { id: dto.serviceTypeId, status: true },
        select: { id: true, name: true, code: true },
      }),
      this.prisma.transferPoint.findFirst({
        where: { id: dto.originTransferPointId, status: true },
        select: { id: true, name: true, code: true, zoneId: true },
      }),
      this.prisma.transferPoint.findFirst({
        where: { id: dto.destinationTransferPointId, status: true },
        select: { id: true, name: true, code: true, zoneId: true },
      }),
    ]);

    if (!currency) throw new NotFoundException('Active currency not found');
    if (!serviceType)
      throw new NotFoundException('Active service type not found');
    if (!origin)
      throw new NotFoundException('Active origin transfer point not found');
    if (!destination)
      throw new NotFoundException('Active destination transfer point not found');
    if (
      serviceType.code !== ONE_WAY_SERVICE_CODE &&
      serviceType.code !== ROUND_TRIP_SERVICE_CODE
    ) {
      throw new BadRequestException('Unsupported service type');
    }

    const rates = await this.prisma.rate.findMany({
      where: {
        originZoneId: origin.zoneId,
        destinationZoneId: destination.zoneId,
        currencyId: dto.currencyId,
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
        vehicle: {
          select: {
            id: true,
            name: true,
            code: true,
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

    return {
      reservation: {
        id: reservation.id,
        folio: reservation.folio,
        status: reservation.reservationStatus,
      },
      current: {
        currency: reservation.currency,
        total: reservation.total,
        rateIds: [...new Set(reservation.transfers.map(({ rateId }) => rateId))],
        vehicles: reservation.transfers.map(({ vehicle }) => vehicle),
      },
      quotation: {
        currency,
        serviceType,
        origin: { id: origin.id, name: origin.name, code: origin.code },
        destination: {
          id: destination.id,
          name: destination.name,
          code: destination.code,
        },
        passengers: dto.passengers,
        options: rates.map(({ id: rateId, price, vehicle }) => ({
          rateId,
          price,
          vehicle,
        })),
      },
    };
  }

  async update(id: number, dto: UpdateReservationDto) {
    const current = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        id: true,
        discount: true,
        paidAmount: true,
        reservationCustomerId: true,
        reservationStatus: { select: { code: true } },
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
    if (current.reservationStatus.code === 'CANCELLED') {
      throw new BadRequestException('A cancelled reservation cannot be updated');
    }

    const quotation = await this.quote(dto);
    const selectedOption = quotation.options.find(
      ({ rateId }) => rateId === dto.rateId,
    );
    if (!selectedOption) {
      throw new BadRequestException(
        'The selected rate is not available for this reservation',
      );
    }

    const [points, initialTransferStatus] = await Promise.all([
      this.prisma.transferPoint.findMany({
        where: {
          id: {
            in: [dto.originTransferPointId, dto.destinationTransferPointId],
          },
        },
        select: { id: true, type: true },
      }),
      current.transfers.length === 0 ||
      (current.transfers.length < 2 &&
        quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE)
        ? this.prisma.transferStatus.findFirst({
            where: { id: INITIAL_TRANSFER_STATUS_ID, status: true },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    const origin = points.find(({ id: pointId }) => {
      return pointId === dto.originTransferPointId;
    });
    const destination = points.find(({ id: pointId }) => {
      return pointId === dto.destinationTransferPointId;
    });
    if (!origin || !destination) {
      throw new NotFoundException('Origin or destination transfer point not found');
    }
    if (
      (current.transfers.length === 0 ||
        (quotation.serviceType.code === ROUND_TRIP_SERVICE_CODE &&
          current.transfers.length < 2)) &&
      !initialTransferStatus
    ) {
      throw new NotFoundException(
        `Active initial transfer status ${INITIAL_TRANSFER_STATUS_ID} not found`,
      );
    }

    const outboundSegment = this.resolveSegment(
      origin.type,
      destination.type,
      false,
    );
    const subtotal = selectedOption.price;
    const calculatedTotal = subtotal.minus(current.discount);
    const total = calculatedTotal.isNegative()
      ? new Prisma.Decimal(0)
      : calculatedTotal;
    const calculatedPending = total.minus(current.paidAmount);
    const pendingAmount = calculatedPending.isNegative()
      ? new Prisma.Decimal(0)
      : calculatedPending;
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

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id },
        data: {
          currencyId: dto.currencyId,
          subtotal,
          total,
          pendingAmount,
        },
      });

      if (current.reservationCustomerId) {
        await tx.reservationCustomer.update({
          where: { id: current.reservationCustomerId },
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
          data: { reservationCustomerId: customer.id },
        });
      }

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

    return this.findOne(id);
  }

  async sendQuoteEmail(id: number, dto: SendQuoteEmailDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: {
        folio: true,
        total: true,
        currency: { select: { code: true } },
        reservationStatus: { select: { code: true } },
        reservationCustomer: {
          select: { firstName: true, lastName: true },
        },
        transfers: {
          select: {
            serviceDate: true,
            serviceTime: true,
            pickupDate: true,
            pickupTime: true,
            passengers: true,
            vehicle: { select: { name: true } },
            originTransferPoint: { select: { name: true } },
            destinationTransferPoint: { select: { name: true } },
          },
          orderBy: [{ serviceDate: 'asc' }, { serviceTime: 'asc' }],
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.reservationStatus.code !== QUOTATION_STATUS_CODE) {
      throw new BadRequestException(
        'Only reservations in quotation status can send a quote email',
      );
    }
    if (!reservation.reservationCustomer) {
      throw new BadRequestException('Reservation customer not found');
    }

    const customerName =
      `${reservation.reservationCustomer.firstName} ${reservation.reservationCustomer.lastName}`.trim();
    const templateData = {
      folio: reservation.folio,
      customerName,
      currencyCode: reservation.currency.code,
      total: reservation.total.toFixed(2),
      transfers: reservation.transfers.map((transfer) => ({
        origin: transfer.originTransferPoint.name,
        destination: transfer.destinationTransferPoint.name,
        serviceDate: transfer.serviceDate,
        serviceTime: transfer.serviceTime,
        pickupDate: transfer.pickupDate,
        pickupTime: transfer.pickupTime,
        passengers: transfer.passengers,
        vehicle: transfer.vehicle.name,
      })),
    };
    const html = renderReservationQuoteEmail(templateData);
    const text = renderReservationQuoteText(templateData);
    const email = dto.email.trim().toLowerCase();

    await this.emailService.sendEmail(
      email,
      `Your Global Shuttle quote - ${reservation.folio}`,
      html,
      text,
    );

    return { reservationId: id, folio: reservation.folio, email };
  }

  async findTransfers(query: ListReservationTransfersDto) {
    const search = query.search?.trim();
    const where: Prisma.ReservationTransferWhereInput = {
      segmentLeg: query.segmentLeg,
      segmentType: query.segmentType,
      transferStatusId: query.transferStatusId,
      serviceDate:
        query.serviceDateFrom || query.serviceDateTo
          ? {
              gte: query.serviceDateFrom
                ? new Date(`${query.serviceDateFrom}T00:00:00.000Z`)
                : undefined,
              lte: query.serviceDateTo
                ? new Date(`${query.serviceDateTo}T00:00:00.000Z`)
                : undefined,
            }
          : undefined,
      reservation: {
        reservationStatusId: query.reservationStatusId,
        paymentStatus: query.paymentStatus,
      },
      ...(search
        ? {
            OR: [
              { reservation: { folio: { contains: search } } },
              {
                reservation: {
                  businessPartnerCode: { contains: search },
                },
              },
              {
                reservation: {
                  reservationCustomer: {
                    is: {
                      OR: [
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                        { phone: { contains: search } },
                        { email: { contains: search } },
                      ],
                    },
                  },
                },
              },
              { flightNumber: { contains: search } },
              { operatorName: { contains: search } },
              { unitName: { contains: search } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [transfers, total] = await this.prisma.$transaction([
      this.prisma.reservationTransfer.findMany({
        where,
        select: transferListSelect,
        orderBy: [
          { serviceDate: 'desc' },
          { serviceTime: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: query.limit,
      }),
      this.prisma.reservationTransfer.count({ where }),
    ]);

    return {
      items: transfers.map(({ reservation, ...transfer }) => ({
        transferId: transfer.id,
        reservationId: reservation.id,
        folio: reservation.folio,
        businessPartnerCode: reservation.businessPartnerCode,
        customer: reservation.reservationCustomer
          ? {
              id: reservation.reservationCustomer.id,
              name: `${reservation.reservationCustomer.firstName} ${reservation.reservationCustomer.lastName}`.trim(),
              phone: reservation.reservationCustomer.phone,
              email: reservation.reservationCustomer.email,
              country: reservation.reservationCustomer.country,
            }
          : null,
        segmentLeg: transfer.segmentLeg,
        segmentType: transfer.segmentType,
        originHotel: transfer.originTransferPoint,
        destinationHotel: transfer.destinationTransferPoint,
        serviceDate: transfer.serviceDate,
        serviceTime: transfer.serviceTime,
        pickupDate: transfer.pickupDate,
        pickupTime: transfer.pickupTime,
        passengers: transfer.passengers,
        flightNumber: transfer.flightNumber,
        airline: transfer.airline,
        operatorName: transfer.operatorName,
        unitName: transfer.unitName,
        transferStatus: transfer.transferStatus,
        paymentStatus: reservation.paymentStatus,
        reservationStatus: reservation.reservationStatus,
        paidAmount: reservation.paidAmount,
        discount: reservation.discount,
        total: reservation.total,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
