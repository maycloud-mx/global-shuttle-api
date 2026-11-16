import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

import type { QuoteReservationDto } from '../dto/quote-reservation.dto.js';
import type { RequoteReservationDto } from '../dto/requote-reservation.dto.js';

const ONE_WAY_SERVICE_CODE = 'ONE_WAY';
const ROUND_TRIP_SERVICE_CODE = 'ROUND_TRIP';
const CANCELLED_STATUS_CODE = 'CANCELLED';

const CANCUN_UTC_OFFSET = '-05:00';

@Injectable()
export class ReservationQuoteService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // QUOTE RESERVATION
  // =========================================================

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
        where: {
          id: dto.currencyId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
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
        },
        select: {
          id: true,
          name: true,
          zoneId: true,
        },
      }),

      this.prisma.transferPoint.findFirst({
        where: {
          id: dto.destinationTransferPointId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          zoneId: true,
        },
      }),

      dto.airlineId
        ? this.prisma.airline.findFirst({
            where: {
              id: dto.airlineId,
              status: true,
            },
            select: {
              id: true,
              name: true,
              iataCode: true,
              icaoCode: true,
            },
          })
        : Promise.resolve(null),

      dto.returnAirlineId
        ? this.prisma.airline.findFirst({
            where: {
              id: dto.returnAirlineId,
              status: true,
            },
            select: {
              id: true,
              name: true,
              iataCode: true,
              icaoCode: true,
            },
          })
        : Promise.resolve(null),

      dto.customer.countryId
        ? this.prisma.country.findFirst({
            where: {
              id: dto.customer.countryId,
              status: true,
            },
            select: {
              id: true,
              name: true,
              iso2: true,
              phoneCode: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!currency) {
      throw new NotFoundException('Active currency not found');
    }

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }

    if (!origin) {
      throw new NotFoundException('Active origin transfer point not found');
    }

    if (!destination) {
      throw new NotFoundException(
        'Active destination transfer point not found',
      );
    }

    if (dto.airlineId && !airline) {
      throw new NotFoundException('Active airline not found');
    }

    if (dto.returnAirlineId && !returnAirline) {
      throw new NotFoundException('Active return airline not found');
    }

    if (dto.customer.countryId && !country) {
      throw new NotFoundException('Active country not found');
    }

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
      },

      destination: {
        id: destination.id,
        name: destination.name,
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
              },

              destination: {
                id: origin.id,
                name: origin.name,
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

  // =========================================================
  // REQUOTE RESERVATION
  // =========================================================

  async requote(id: number, dto: RequoteReservationDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },

      select: {
        id: true,
        folio: true,
        total: true,

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

        transfers: {
          select: {
            rateId: true,

            vehicle: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.reservationStatus.code === CANCELLED_STATUS_CODE) {
      throw new BadRequestException(
        'A cancelled reservation cannot be requoted',
      );
    }

    if (dto.originTransferPointId === dto.destinationTransferPointId) {
      throw new BadRequestException(
        'Origin and destination transfer points must be different',
      );
    }

    const [currency, serviceType, origin, destination] = await Promise.all([
      this.prisma.currency.findFirst({
        where: {
          id: dto.currencyId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
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
        },
        select: {
          id: true,
          name: true,
          zoneId: true,
        },
      }),

      this.prisma.transferPoint.findFirst({
        where: {
          id: dto.destinationTransferPointId,
          status: true,
        },
        select: {
          id: true,
          name: true,
          zoneId: true,
        },
      }),
    ]);

    if (!currency) {
      throw new NotFoundException('Active currency not found');
    }

    if (!serviceType) {
      throw new NotFoundException('Active service type not found');
    }

    if (!origin) {
      throw new NotFoundException('Active origin transfer point not found');
    }

    if (!destination) {
      throw new NotFoundException(
        'Active destination transfer point not found',
      );
    }

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

    return {
      reservation: {
        id: reservation.id,
        folio: reservation.folio,
        status: reservation.reservationStatus,
      },

      current: {
        currency: reservation.currency,
        total: reservation.total,

        rateIds: [
          ...new Set(reservation.transfers.map(({ rateId }) => rateId)),
        ],

        vehicles: reservation.transfers.map(({ vehicle }) => vehicle),
      },

      quotation: {
        currency,
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

        options: rates.map(({ id: rateId, price, vehicle }) => ({
          rateId,
          price,
          vehicle,
        })),
      },
    };
  }

  // =========================================================
  // VALIDATE SCHEDULE
  // =========================================================

  private validateSchedule(
    dto: QuoteReservationDto,
    serviceTypeCode: string,
  ): void {
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

  // =========================================================
  // DATE UTILITIES
  // =========================================================

  private toCancunTimestamp(date: string, time: string): number {
    const timestamp = Date.parse(`${date}T${time}:00${CANCUN_UTC_OFFSET}`);

    if (Number.isNaN(timestamp)) {
      throw new BadRequestException('Invalid service or pickup date/time');
    }

    return timestamp;
  }
}
