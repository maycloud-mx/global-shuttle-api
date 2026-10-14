import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ListReservationTransfersDto } from './dto/list-reservation-transfers.dto.js';
import type { QuoteReservationDto } from './dto/quote-reservation.dto.js';

const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCUN_UTC_OFFSET = '-05:00';
const CANCUN_TIME_ZONE = 'America/Cancun';
const QUOTATION_STATUS_NAME = 'Cotización';
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
      reservationStatus: { select: { id: true, name: true } },
      reservationCustomer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.ReservationTransferSelect;

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

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
          luggageCapacity: { gte: dto.luggage },
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
        where: { name: QUOTATION_STATUS_NAME, status: true },
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
        reservationStatus: { select: { id: true, name: true } },
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
