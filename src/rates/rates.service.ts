
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { ListRatesGridDto } from './dto/list-rates-grid.dto.js';
import type {
  UpsertRateGridItemDto,
  UpsertRatesGridDto,
} from './dto/upsert-rates-grid.dto.js';

const rateInclude = {
  originZone: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  destinationZone: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      name: true,
    },
  },
  currency: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  serviceType: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const;

@Injectable()
export class RatesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getGrid(query: ListRatesGridDto) {
    const originZone = await this.prisma.zone.findFirst({
      where: {
        id: query.zoneId,
        status: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!originZone) {
      throw new NotFoundException(
        'Origin zone not found or inactive',
      );
    }

    const [
      destinations,
      vehicles,
      currencies,
      serviceTypes,
      rates,
    ] = await Promise.all([
      this.prisma.zone.findMany({
        where: {
          status: true,
          ...(query.destinationZoneId !== undefined
            ? { id: query.destinationZoneId }
            : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.vehicle.findMany({
        where: {
          status: true,
          ...(query.vehicleId !== undefined
            ? { id: query.vehicleId }
            : {}),
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.currency.findMany({
        where: {
          status: true,
          ...(query.currencyId !== undefined
            ? { id: query.currencyId }
            : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),

      this.prisma.serviceType.findMany({
        where: {
          status: true,
          ...(query.serviceTypeId !== undefined
            ? { id: query.serviceTypeId }
            : {}),
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: {
          id: 'asc',
        },
      }),

      this.prisma.rate.findMany({
        where: {
          originZoneId: query.zoneId,

          ...(query.destinationZoneId !== undefined
            ? {
                destinationZoneId:
                  query.destinationZoneId,
              }
            : {}),

          ...(query.vehicleId !== undefined
            ? { vehicleId: query.vehicleId }
            : {}),

          ...(query.currencyId !== undefined
            ? { currencyId: query.currencyId }
            : {}),

          ...(query.serviceTypeId !== undefined
            ? { serviceTypeId: query.serviceTypeId }
            : {}),

          destinationZone: {
            status: true,
          },
          vehicle: {
            status: true,
          },
          currency: {
            status: true,
          },
          serviceType: {
            status: true,
          },
        },
        select: {
          id: true,
          originZoneId: true,
          destinationZoneId: true,
          vehicleId: true,
          currencyId: true,
          serviceTypeId: true,
          price: true,
          status: true,
        },
      }),
    ]);

    const createKey = (
      destinationZoneId: number,
      vehicleId: number,
      currencyId: number,
      serviceTypeId: number,
    ): string => {
      return [
        destinationZoneId,
        vehicleId,
        currencyId,
        serviceTypeId,
      ].join(':');
    };

    const ratesMap = new Map<
      string,
      (typeof rates)[number]
    >();

    for (const rate of rates) {
      const key = createKey(
        rate.destinationZoneId,
        rate.vehicleId,
        rate.currencyId,
        rate.serviceTypeId,
      );

      ratesMap.set(key, rate);
    }

    const allItems = destinations.flatMap(
      (destination) =>
        vehicles.flatMap((vehicle) =>
          currencies.flatMap((currency) =>
            serviceTypes.map((serviceType) => {
              const key = createKey(
                destination.id,
                vehicle.id,
                currency.id,
                serviceType.id,
              );

              const rate = ratesMap.get(key);

              return {
                id: rate?.id ?? null,

                originZoneId: originZone.id,
                destinationZoneId: destination.id,
                vehicleId: vehicle.id,
                currencyId: currency.id,
                serviceTypeId: serviceType.id,

                destinationZone: destination,
                vehicle,
                currency,
                serviceType,

                price: rate?.price ?? null,
                status: rate?.status ?? null,
              };
            }),
          ),
        ),
    );

    // El estado se filtra después de generar
    // las combinaciones para no confundir
    // tarifas inactivas con tarifas faltantes.
    const items =
      query.status === undefined
        ? allItems
        : allItems.filter(
            (item) => item.status === query.status,
          );

    let configured = 0;
    let inactive = 0;
    let missing = 0;

    for (const item of items) {
      if (item.id === null) {
        missing++;
      } else if (item.status === true) {
        configured++;
      } else {
        inactive++;
      }
    }

    const expected = items.length;
    const pending = missing + inactive;

    const calculatePercentage = (
      value: number,
    ): number | null => {
      if (expected === 0) {
        return null;
      }

      return (
        Math.round((value / expected) * 10000) /
        100
      );
    };

    return {
      originZone,

      summary: {
        expected,
        configured,
        pending,
        missing,
        inactive,
        coveragePercentage:
          calculatePercentage(configured),
        pendingPercentage:
          calculatePercentage(pending),
      },

      items,
    };
  }

  async saveGrid(
    dto: UpsertRatesGridDto,
    userId: number,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'At least one rate is required',
      );
    }

    this.ensureSingleOriginZone(dto.items);
    this.ensureUniqueCombinations(dto.items);

    await this.ensureReferencesExist(dto.items);

    try {
      const items = await this.prisma.$transaction(
        async (tx) => {
          const savedItems = [];

          for (const item of dto.items) {
            const rate = await tx.rate.upsert({
              where: {
                originZoneId_destinationZoneId_vehicleId_currencyId_serviceTypeId: {
                  originZoneId: item.originZoneId,
                  destinationZoneId:
                    item.destinationZoneId,
                  vehicleId: item.vehicleId,
                  currencyId: item.currencyId,
                  serviceTypeId: item.serviceTypeId,
                },
              },

              create: {
                originZoneId: item.originZoneId,
                destinationZoneId:
                  item.destinationZoneId,
                vehicleId: item.vehicleId,
                currencyId: item.currencyId,
                serviceTypeId: item.serviceTypeId,
                price: item.price,
                status: true,
                createdById: userId,
                updatedById: userId,
              },

              update: {
                price: item.price,
                updatedById: userId,
              },

              include: rateInclude,
            });

            savedItems.push(rate);
          }

          return savedItems;
        },
        {
          maxWait: 5000,
          timeout: 60000,
        },
      );

      return {
        total: items.length,
        items,
      };
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'A rate already exists for this combination',
          );
        }

        if (error.code === 'P2003') {
          throw new BadRequestException(
            'One or more rate references are invalid',
          );
        }
      }

      throw error;
    }
  }

  private ensureSingleOriginZone(
    items: UpsertRateGridItemDto[],
  ): void {
    const originZoneId = items[0].originZoneId;

    const hasDifferentOrigin = items.some(
      (item) =>
        item.originZoneId !== originZoneId,
    );

    if (hasDifferentOrigin) {
      throw new BadRequestException(
        'All rates must have the same origin zone',
      );
    }
  }

  private ensureUniqueCombinations(
    items: UpsertRateGridItemDto[],
  ): void {
    const combinations = new Set<string>();

    for (const item of items) {
      const key = [
        item.originZoneId,
        item.destinationZoneId,
        item.vehicleId,
        item.currencyId,
        item.serviceTypeId,
      ].join(':');

      if (combinations.has(key)) {
        throw new ConflictException(
          'The request contains duplicate rate combinations',
        );
      }

      combinations.add(key);
    }
  }

  private async ensureReferencesExist(
    items: UpsertRateGridItemDto[],
  ): Promise<void> {
    const zoneIds = [
      ...new Set(
        items.flatMap((item) => [
          item.originZoneId,
          item.destinationZoneId,
        ]),
      ),
    ];

    const vehicleIds = [
      ...new Set(
        items.map((item) => item.vehicleId),
      ),
    ];

    const currencyIds = [
      ...new Set(
        items.map((item) => item.currencyId),
      ),
    ];

    const serviceTypeIds = [
      ...new Set(
        items.map((item) => item.serviceTypeId),
      ),
    ];

    const [
      zones,
      vehicles,
      currencies,
      serviceTypes,
    ] = await Promise.all([
      this.prisma.zone.findMany({
        where: {
          id: {
            in: zoneIds,
          },
          status: true,
        },
        select: {
          id: true,
        },
      }),

      this.prisma.vehicle.findMany({
        where: {
          id: {
            in: vehicleIds,
          },
          status: true,
        },
        select: {
          id: true,
        },
      }),

      this.prisma.currency.findMany({
        where: {
          id: {
            in: currencyIds,
          },
          status: true,
        },
        select: {
          id: true,
        },
      }),

      this.prisma.serviceType.findMany({
        where: {
          id: {
            in: serviceTypeIds,
          },
          status: true,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (zones.length !== zoneIds.length) {
      throw new BadRequestException(
        'One or more zones do not exist or are inactive',
      );
    }

    if (vehicles.length !== vehicleIds.length) {
      throw new BadRequestException(
        'One or more vehicles do not exist or are inactive',
      );
    }

    if (currencies.length !== currencyIds.length) {
      throw new BadRequestException(
        'One or more currencies do not exist or are inactive',
      );
    }

    if (serviceTypes.length !== serviceTypeIds.length) {
      throw new BadRequestException(
        'One or more service types do not exist or are inactive',
      );
    }
  }
}
